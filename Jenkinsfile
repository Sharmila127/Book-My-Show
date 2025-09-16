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
