pipeline {
    agent any
    tools {
        jdk 'jdk21'
        nodejs 'node24'
    }

    environment {
        GIT_CREDENTIALS = 'github-token'   // GitHub credentials in Jenkins
        
        IMAGE_NAME = 'mahesraj/bms:latest' // Docker image name
        APP_PORT = '3000'                  // Internal app port
        HOST_PORT = '3000'                 // External port
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout from Git') {
            steps {
                git branch: 'main',
                    credentialsId: "docker",
                    url: 'https://github.com/Mahes-raj/Book-My-Show.git'
                sh 'ls -la'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                echo "Installing dependencies..."
                if [ -f package.json ]; then
                    rm -rf node_modules package-lock.json
                    npm install
                else
                    echo "Error: package.json not found!"
                    exit 1
                fi
                '''
            }
        }

        stage('Docker Build & Push') {
            options { timeout(time: 30, unit: 'MINUTES') } // Prevent build timeout
            steps {
                script {
                    withDockerRegistry(credentialsId: "${DOCKER_CREDENTIALS}", toolName: 'docker') {
                        sh '''
                        echo "Creating .dockerignore to speed up build..."
                        cat <<EOL > .dockerignore
node_modules
.git
.gitignore
BMS-Document.txt
EOL

                        echo "Building Docker image..."
                        docker build --no-cache -t ${IMAGE_NAME} -f Dockerfile .

                        echo "Pushing Docker image to registry..."
                        docker push ${IMAGE_NAME}
                        '''
                    }
                }
            }
        }

        stage('Deploy to Container') {
            steps {
                sh '''
                echo "Stopping any container using port ${HOST_PORT}..."
                docker ps --filter "publish=${HOST_PORT}" --format "{{.ID}}" | xargs -r docker stop
                docker ps -a --filter "publish=${HOST_PORT}" --format "{{.ID}}" | xargs -r docker rm

                echo "Stopping and removing old bms container..."
                docker stop bms || true
                docker rm bms || true

                echo "Running new container on port ${HOST_PORT}..."
                docker run -d --restart=always --name bms -p ${HOST_PORT}:${APP_PORT} ${IMAGE_NAME}

                echo "Checking running containers..."
                docker ps -a

                echo "Fetching logs..."
                sleep 5
                docker logs bms
                '''
            }
        }
    }
}

