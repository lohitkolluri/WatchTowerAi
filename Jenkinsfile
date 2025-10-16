pipeline {
  agent any

  environment {
    AWS_DEFAULT_REGION = credentials('aws-default-region')
    AWS_ACCESS_KEY_ID = credentials('aws-access-key-id')
    AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
    AWS_SESSION_TOKEN = credentials('aws-session-token')

    SSH_PRIVATE_KEY = credentials('ec2-ssh-private-key')
    EC2_SSH_USER = 'ubuntu'
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Terraform Init & Plan') {
      steps {
        dir('infra/terraform') {
          sh 'terraform init -input=false'
          sh '''terraform plan -input=false \
            -var aws_region=${AWS_DEFAULT_REGION} \
            -var key_pair_name=watchtower-jenkins \
            -var ssh_public_key="$TF_VAR_SSH_PUBLIC_KEY" \
            -out tfplan'''
        }
      }
    }

    stage('Terraform Apply') {
      steps {
        dir('infra/terraform') {
          sh 'terraform apply -input=false -auto-approve tfplan'
        }
      }
    }

    stage('Fetch EC2 IP') {
      steps {
        dir('infra/terraform') {
          script {
            env.EC2_PUBLIC_IP = sh(returnStdout: true, script: 'terraform output -raw ec2_public_ip').trim()
          }
          echo "EC2 IP: ${env.EC2_PUBLIC_IP}"
        }
      }
    }

    stage('Deploy via SSH + Docker Compose') {
      steps {
        script {
          writeFile file: 'sshkey.pem', text: SSH_PRIVATE_KEY
          sh 'chmod 600 sshkey.pem'
        }
        sh '''ssh -o StrictHostKeyChecking=no -i sshkey.pem ${EC2_SSH_USER}@${EC2_PUBLIC_IP} \
          "cd /opt/WatchTowerAi && sudo docker compose pull && sudo docker compose up -d --build"'''
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}


