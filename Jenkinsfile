pipeline {
    agent any

    environment {
        DOCKER_TAG = "20250406"
        IMAGE_NAME = "manojkrishnappa/jiohotstar"
        AWS_REGION = "us-east-1"
        CLUSTER_NAME = "microdegree-cluster"
        SCANNER_HOME = tool 'sonar-scanner'
    }

    tools {
        nodejs 'node' // Node.js tool installation
    }

    stages {
        stage('Git Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/ManojKRISHNAPPA/Jio-hotstar-DevSecOps-Project.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh ''' $SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=MicroDegree \
                    -Dsonar.projectKey=MicroDegree '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install' // Install Node.js dependencies
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build' // Assuming there's a build script in your package.json
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck additionalArguments: '--scan ./ --disableYarnAudit --disableNodeAudit --nvdApiKey YOUR_NVD_API_KEY', odcInstallation: 'DC'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Build & Tag Docker Image') {
            steps {
                script {
                    sh "docker build -t ${IMAGE_NAME}:${DOCKER_TAG} ."
                }
            }
        }

        stage('Trivy Docker Image Scan') {
            steps {
                script {
                    sh "trivy image --format table -o trivy-image-report.html ${IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Trivy File System Scan') {
            steps {
                script {
                    sh "trivy fs . > trivy-fs-report.txt"
                }
            }
        }

        stage('Kubernetes Manifest Scan') {
            steps {
                script {
                    // Install kubescape (if it's not available already)
                    sh 'curl -s https://github.com/kubescape/kubescape/releases/download/v1.0.0/kubescape-linux-amd64 -o /usr/local/bin/kubescape && chmod +x /usr/local/bin/kubescape'
                    // Scan the Kubernetes manifest files for security issues
                    sh 'kubescape scan --exclude-namespaces kube-system --use-k8s-resources --scan-path ./deployment.yml,./service.yml'
                }
            }
        }

        stage('Login to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh "echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin"
                    }
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    sh "docker push ${IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Updating the Cluster') {
            steps {
                script {
                    sh "aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}"
                }
            }
        }

        stage('Deploy To Kubernetes') {
            steps {
                withKubeConfig(caCertificate: '', clusterName: 'microdegree-cluster', contextName: '', credentialsId: 'kube', namespace: 'microdegree', restrictKubeConfigAccess: false, serverUrl: 'https://E00BC60076C20B56479850D48D8E35F5.gr7.us-east-1.eks.amazonaws.com') {
                    sh "kubectl get pods -n microdegree"
                    sh "kubectl apply -f deployment.yml -n microdegree"
                }
            }
        }

        stage('Verify the Deployment') {
            steps {
                withKubeConfig(caCertificate: '', clusterName: 'microdegree-cluster', contextName: '', credentialsId: 'kube', namespace: 'microdegree', restrictKubeConfigAccess: false, serverUrl: 'https://E00BC60076C20B56479850D48D8E35F5.gr7.us-east-1.eks.amazonaws.com') {
                    sh "kubectl get pods -n microdegree"
                    sh "kubectl get svc -n microdegree"
                }
            }
        }
    }

    post {
        always {
            script {
                def jobName = env.JOB_NAME
                def buildNumber = env.BUILD_NUMBER
                def pipelineStatus = currentBuild.result ?: 'UNKNOWN'
                def bannerColor = pipelineStatus.toUpperCase() == 'SUCCESS' ? 'green' : 'red'

                def body = """
                    <html>
                    <body>
                    <div style="border: 4px solid ${bannerColor}; padding: 10px;">
                    <h2>${jobName} - Build ${buildNumber}</h2>
                    <div style="background-color: ${bannerColor}; padding: 10px;">
                    <h3 style="color: white;">Pipeline Status: ${pipelineStatus.toUpperCase()}</h3>
                    </div>
                    <p>Check the <a href="${BUILD_URL}">console output</a>.</p>
                    </div>
                    </body>
                    </html>
                """

                emailext (
                    subject: "${jobName} - Build ${buildNumber} - ${pipelineStatus.toUpperCase()}",
                    body: body,
                    to: 'manojdevopstest@gmail.com',
                    from: 'manojdevopstest@gmail.com',
                    replyTo: 'manojdevopstest@gmail.com',
                    mimeType: 'text/html',
                    attachmentsPattern: 'trivy-image-report.html,trivy-fs-report.txt,dependency-check-report.xml'
                )
            }
        }
    }
}
