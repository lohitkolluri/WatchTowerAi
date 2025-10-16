pipeline {
    agent any

    environment {
        MONGODB_URI = credentials('mongo-uri')
        GEMINI_API_KEY = credentials('gemini-key')
        SMTP_USERNAME = credentials('smtp-email')
        SMTP_PASSWORD = credentials('smtp-pass')
    }

    stages {

        stage('Clone Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/lohitkolluri/WatchTowerAi.git'
            }
        }

        stage('Build Frontend') {
            steps {
                dir('Frontend') {
                    sh 'yarn install'
                    sh 'yarn build'
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshPublisher(publishers: [
                    sshPublisherDesc(
                        configName: 'EC2',
                        transfers: [
                            sshTransfer(
                                sourceFiles: '**',
                                remoteDirectory: '/home/ubuntu/watchtower',
                                execCommand: '''
                                cd /home/ubuntu/watchtower/Backend
                                pm2 stop watchtower_backend || true
                                pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name watchtower_backend

                                cd /home/ubuntu/watchtower/Frontend
                                pm2 stop watchtower_frontend || true
                                pm2 start "yarn start" --name watchtower_frontend
                                '''
                            )
                        ]
                    )
                ])
            }
        }
    }
}
