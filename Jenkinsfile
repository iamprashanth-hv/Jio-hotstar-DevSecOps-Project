pipeline {
    agent any

    tools {
        jdk 'java-17'
        nodejs 'node'
    }

    environment {
        SCANNER_HOME = tool 'sonar-scanner'
        DOCKER_TAG = "20250409"  // You can dynamically assign a commit hash here
        IMAGE_NAME = "manojkrishnappa/jiohotstar"
        AWS_REGION = "us-east-1"
        CLUSTER_NAME = "microdegree-cluster"
    }

    stages {
        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout from Git') {
            steps {
                git branch: 'main', credentialsId: 'github-token', url: 'https://github.com/ManojKRISHNAPPA/Jio-hotstar-DevSecOps-Project.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                    $SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=Hotstar \
                    -Dsonar.projectKey=Hotstar
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    // Wait for quality gate but do not abort the pipeline
                    waitForQualityGate abortPipeline: false, credentialsId: 'Sonar-token'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh "npm install"
            }
        }

        // OWASP FS Scan (Handling vulnerabilities but not aborting the pipeline)
        stage('OWASP FS Scan') {
            steps {
                script {
                    echo "Starting OWASP Dependency-Check FS scan..."

                    // Run OWASP Dependency-Check with offline mode enabled
                    dependencyCheck additionalArguments: '--scan ./ --offline --disableYarnAudit --disableNodeAudit --nvdApiKey 0ad9f72c-7dcd-4a1d-af36-83d8cc7f3526 ', odcInstallation: 'DC'

                    // Check if there are critical vulnerabilities
                    def criticalVulns = sh(script: 'grep -c "CRITICAL" dependency-check-report.xml', returnStdout: true).trim()

                    // If there are critical vulnerabilities, log them but continue the pipeline
                    if (criticalVulns.toInteger() > 0) {
                        echo "Critical vulnerabilities found: ${criticalVulns}"
                        // Optionally, send an email or notification about the critical vulnerabilities
                    }
                }

                // Archive the report and publish it
                archiveArtifacts allowEmptyArchive: true, artifacts: '**/dependency-check-report.xml', followSymlinks: false
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Trivy FS Scan') {
            steps {
                sh "trivy fs . > trivyfs.txt"
            }
        }

        stage('Build & Tag Docker Image') {
            steps {
                script {
                    sh "docker build -t ${IMAGE_NAME}:${DOCKER_TAG} ."
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image ${IMAGE_NAME}:${DOCKER_TAG} > trivy-image-report.html"
            }
        }

        stage('Login to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        // Login to Docker Hub
                        sh "echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin"
                    }
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    // Push the image to Docker Hub with both the tag and latest
                    sh "docker push ${IMAGE_NAME}:${DOCKER_TAG}"
                }
            }
        }

        stage('Updating the Cluster') {
            steps {
                script {
                    // Update the kubeconfig for AWS EKS
                    sh "aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}"
                }
            }
        }

        stage('Kubernetes Manifest Scan') {
            steps {
                script {
                    // Scan the Kubernetes manifest files for security issues
                    sh 'kubescape scan deployment.yml'
                }
            }
        }

        stage('Deploy To Kubernetes') {
            steps {
                withKubeConfig(caCertificate: '', clusterName: 'microdegree-cluster', contextName: '', credentialsId: 'kube', namespace: 'microdegree', restrictKubeConfigAccess: false, serverUrl: 'https://BA1030EE916B1A57868E10E5E422B039.gr7.us-east-1.eks.amazonaws.com') {
                    sh "kubectl get pods -n microdegree"
                    sh "kubectl apply -f deployment.yml -n microdegree"
                }
            }
        }

        stage('Verify the Deployment') {
            steps {
                withKubeConfig(caCertificate: '', clusterName: 'microdegree-cluster', contextName: '', credentialsId: 'kube', namespace: 'microdegree', restrictKubeConfigAccess: false, serverUrl: 'https://BA1030EE916B1A57868E10E5E422B039.gr7.us-east-1.eks.amazonaws.com') {
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
                    attachmentsPattern: 'trivy-image-report.html,trivyfs.txt,dependency-check-report.xml'
                )
            }
        }
    }
}
