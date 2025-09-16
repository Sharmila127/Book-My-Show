CI/CD Deployment with Automated Test
Repository: book-my-show(sample app)
Technology Stack: React 
Deployment Target: Docker container on remote Ubuntu server (AWS EC2) 
CI/CD Tool: Jenkins (Declarative Pipeline)
 Security & Quality Tools:
•	Trivy – SCA & Docker image vulnerability scanning 
•	SonarQube – Static code analysis (SAST) 
•	OWASP ZAP – Dynamic security testing (DAST)
Software & Environment Installation
1.JENKINS INSTALLATION
sudo apt update
sudo apt install fontconfig openjdk-21-jre
java -version
openjdk version "21.0.3" 2024-04-16
OpenJDK Runtime Environment (build 21.0.3+11-Debian-2)
OpenJDK 64-Bit Server VM (build 21.0.3+11-Debian-2, mixed mode, sharing)


sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc]" \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install Jenkins


2. Docker Installation
Install Docker using curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

 Add your user to the docker group (fix permissions)
sudo usermod -aG docker $USER

 Apply the group change immediately
newgrp docker

 Verify Docker works without sudo
docker run hello-world

sudo usermod -aG docker jenkins
sudo systemctl restart jenkins



sudo apt update -y
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

3. SonarQube & ZAP Installation
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community

docker run -u zap -p 8000:8000 -i ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon -port 8000 -host 0.0.0.0

NPM Installation
apt install npm

4. Jenkins Setup
•	Access Jenkins at http://<server-ip>:8080
•	Configure SonarQube:
o	SonarQube URL: http://<server-ip>:9000
o	Generate a token in SonarQube and save it in Jenkins as credential ID: sonar-token

5. Jenkins Pipeline (Book My Show)
Key stages:
•	Checkout Code (GitHub) – Pull the latest code from GitHub.
•	Install npm dependencies – Install required Node.js packages.
•	Prepare Reports Folder – Create a folder to store all reports.
•	Trivy FS Scan – Scan source code for vulnerabilities (SAST).
•	SonarQube Analysis – Check code quality, bugs, and security issues.
•	Build React App – Compile the React frontend for production.
•	Build Docker Image – Package the app into a Docker image.
•	Trivy Docker Image Scan – Scan Docker image for vulnerabilities.
•	Stop Existing Container – Remove any running container of the app.
•	Run Docker Container – Start the new container with the app.
•	DAST Scan (OWASP ZAP) – Scan the running app for security issues (DAST).
•	Smoke Test – Verify the app is running and responding.
•	Archive All Reports – Save all reports in Jenkins for review.

Jenkins pipeline
pipeline {
    agent any

    environment {
        IMAGE_NAME = "my-bms-app"
        CONTAINER_NAME = "my-bms-container"
        APP_PORT = "3000"
        SONARQUBE = "SonarQube"                   // SonarQube server name in Jenkins
        SONAR_TOKEN = credentials('sonar-token') // Jenkins credential ID
        REPORTS_DIR = "${WORKSPACE}/reports"     // Reports folder
    }

    stages {

        stage('Checkout Code') {
            steps {
                echo "Pulling code from GitHub..."
                git url: 'https://github.com/Sharmila127/Book-My-Show.git', branch: 'main'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "Installing npm dependencies..."
                sh 'npm install'
                sh 'chmod -R 755 node_modules/.bin'
            }
        }

        stage('Prepare Reports Folder') {
            steps {
                echo "Creating reports directory..."
                sh "mkdir -p ${REPORTS_DIR}"
            }
        }

        stage('Trivy FS Scan') {
            steps {
                echo "Scanning source code with Trivy..."
                sh """
                trivy fs --severity HIGH,CRITICAL -f html -o ${REPORTS_DIR}/trivy-fs-report.html . || true
                trivy fs --severity HIGH,CRITICAL -f table -o ${REPORTS_DIR}/trivy-fs-report.txt . || true
                """
                archiveArtifacts artifacts: 'reports/trivy-fs-report.*', allowEmptyArchive: true
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONARQUBE}") {
                    echo "Running SonarQube analysis..."
                    sh """
                    npx sonarqube-scanner \
                        -Dsonar.projectKey=BookMyShow \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=$SONAR_HOST_URL \
                        -Dsonar.login=$SONAR_TOKEN
                    """
                }
            }
        }

        stage('Build React App') {
            steps {
                echo "Building React app..."
                sh 'CI=false npm run build'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker image..."
                sh "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Trivy Docker Image Scan') {
            steps {
                echo "Scanning Docker image with Trivy..."
                sh """
                trivy image --severity HIGH,CRITICAL -f html -o ${REPORTS_DIR}/trivy-image-report.html ${IMAGE_NAME} || true
                trivy image --severity HIGH,CRITICAL -f table -o ${REPORTS_DIR}/trivy-image-report.txt ${IMAGE_NAME} || true
                """
                archiveArtifacts artifacts: 'reports/trivy-image-report.*', allowEmptyArchive: true
            }
        }

        stage('Stop Existing Container') {
            steps {
                echo "Stopping existing container if running..."
                sh """
                if [ \$(docker ps -a -q -f name=${CONTAINER_NAME}) ]; then
                    docker rm -f ${CONTAINER_NAME}
                fi
                """
            }
        }

        stage('Run Docker Container') {
            steps {
                echo "Running Docker container..."
                sh "docker run -d -p ${APP_PORT}:${APP_PORT} --name ${CONTAINER_NAME} -e BROWSER=none ${IMAGE_NAME}"
                sh "sleep 15"  // wait for app to start
            }
        }

        stage('DAST Scan (OWASP ZAP)') {
            steps {
                echo "Running OWASP ZAP DAST scan..."
                sh "mkdir -p ${REPORTS_DIR}"
                sh "sleep 15"  // ensure app is running

                // Use host networking on Ubuntu so ZAP can reach localhost
                sh """
                docker run --rm --network host -v ${REPORTS_DIR}:/zap/wrk \
                    owasp/zap2docker-stable zap-baseline.py \
                    -t http://localhost:${APP_PORT} \
                    -r /zap/wrk/zap_report.html || true
                """

                // Archive ZAP report
                archiveArtifacts artifacts: 'reports/zap_report.html', allowEmptyArchive: true
            }
        }

        stage('Smoke Test') {
            steps {
                echo "Verifying the app is running..."
                sh "curl -f http://localhost:${APP_PORT} || exit 1"
            }
        }

        stage('Archive All Reports') {
            steps {
                echo "Archiving all reports for Jenkins build..."
                archiveArtifacts artifacts: 'reports/*.html', allowEmptyArchive: true
                archiveArtifacts artifacts: 'reports/*.txt', allowEmptyArchive: true
            }
        }
    }

    post {
        success {
            echo "✅ Book My Show app deployed, scanned (SAST + DAST), and running successfully!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
    }
}

6.Create workspace reports folder


ls /var/lib/jenkins/workspace/
App  app@tmp

cd /var/lib/jenkins/workspace/App/reports
ls -lh

Folder permission issues
•	You previously tried /root/Book-My-Show/reports and got permission denied.
•	✅ Solution: Use Jenkins workspace folder:
/var/lib/jenkins/workspace/APP/reports
•	Make sure the folder exists:
mkdir -p /var/lib/jenkins/workspace/APP/reports
chown -R jenkins:jenkins /var/lib/jenkins/workspace/APP/reports

Run ZAP on a different port (if 8080 conflicts)
mkdir -p ~/zap-reports

/snap/zaproxy/current/zap.sh \
    -cmd -quickurl http://localhost:3000 \
    -quickout ~/zap-reports/zap_report.html \
    -port 9090

7. Copy Trivy & ZAP Reports to Local Folder
Create local folder
mkdir -p ~/local-reports
Copy Trivy reports
cp /var/lib/jenkins/workspace/APP/reports/trivy-fs-report.* ~/local-reports/
cp /var/lib/jenkins/workspace/APP/reports/trivy-image-report.* ~/local-reports/
 Copy ZAP report
cp ~/zap-reports/zap_report.html ~/local-reports/
Move files (optional)
mv /var/lib/jenkins/workspace/APP/reports/trivy-fs-report.* ~/local-reports/
mv /var/lib/jenkins/workspace/APP/reports/trivy-image-report.* ~/local-reports/
mv ~/zap-reports/zap_report.html ~/local-reports/
 Verify
ls -lh ~/local-reports
Expected output:
-rw-r--r-- 1 root root  15K Sep 16 trivy-fs-report.txt
-rw-r--r-- 1 root root 152K Sep 16 trivy-image-report.txt
-rw-r--r-- 1 root root  51K Sep 16 zap_report.html

8. Transfer Reports to Ubuntu User (if run as root)
sudo cp -r /root/local-reports /home/ubuntu/
sudo chown -R ubuntu:ubuntu /home/ubuntu/local-reports
ls -l /home/ubuntu/

9. Summary
•	Pipeline: Complete CI/CD pipeline for Book My Show React app
•	Tools used: Jenkins, Docker, Docker Compose, SonarQube, OWASP ZAP, Trivy, npm
•	Security Scans:
o	SAST: SonarQube
o	DAST: OWASP ZAP
o	Container & File Scans: Trivy
•	Reports folder: /var/lib/jenkins/workspace/<JOB_NAME>/reports → copied to ~/local-reports for local use

OUTPUT IMAGES :
 
 

 
