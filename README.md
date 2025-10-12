# FLERVOICE

A web application for managing and transcribing videos, built with Node.js, Express, MongoDB, and jQuery. It allows users to upload videos with transcriptions, edit speakers, tags, and sentences, search through content, and use a training mode for annotation.

## Installation
This guide outlines the steps to install and configure Dopetv on an Ubuntu server. Follow each section carefully to ensure a successful setup.

### Clone and Set Up the dope.tv Repository
Change to the web server directory:
```
cd /var/www/
```
Clone the repository using Git (maybe you’ll need to use your PAL as password):
```
sudo git clone https://github.com/clubmate/flervoice.git
```
> [!IMPORTANT]
> Username is "clubmate" and a PAL (Personal Access Token) must be specified as the password. this can be created at https://github.com/settings/tokens

### Install Dependencies
Navigate into the project directory and install `Node.js` dependencies:
```
cd /var/www/flervoice
```
Install all Node.js dependencies:
```
sudo npm install
```

### Create media directory
```
mkdir media
```

### Change ownership of the flervoice directory
Set ownership so that both you and the web server can access files properly:
```
sudo chown -R $USER:$USER /var/www/flervoice
```
```
sudo chown -R www-data:www-data /var/www/flervoice/media
```

### Try to start the application
Start the application to ensure everything works as expected:
```
npm run start
```

## Configure flervoice as a system service
Setting up a systemd service allows your application to start on boot and automatically restart on failure.
### Create a systemd service file
Open a new service file for editing:
```
sudo nano /etc/systemd/system/flervoice.service
```
Add the following configuration:
```
[Unit]
Description=flervoice
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/flervoice
ExecStart=/usr/bin/npm run start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
### Enable and start the service
Reload systemd to pick up the new service file:
```
sudo systemctl daemon-reload
```
Enable the service to start on boot:
```
sudo systemctl enable flervoice
```
Start the service immediately:
```
sudo systemctl start flervoice
```
Check the status:
```
sudo systemctl status flervoice
```
View logs:
```
sudo journalctl -fu flervoice
```

## Setting up Nginx
### Create Nginx Configuration
Create configuration in `/etc/nginx/sites-available/dopetv`
```
sudo nano /etc/nginx/sites-available/dopetv
```
Add configuration:
```
# FLERVOICE
server {
    listen 80;
    server_name fler.senderfreiesberlin.com fler.senderfreiesberlin.org;

    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size if needed:
    client_max_body_size 800M;
}
```
Test your nginx configuration for errors:
```
sudo nginx -t
```
Restart `nginx` to apply changes:
```
sudo systemctl restart nginx
```
Check the status of `nginx`:
```
sudo systemctl status nginx
```

## Configure Backup System
Creating a backup system is critical. This section is a placeholder for backup script instructions. Modify the script below to suit your backup strategy.

Create backup script:
```
nano /home/boll/backup-flervoice.sh
```
backup-flervoice.sh:
```
#!/bin/bash

# Set variables
BACKUP_DIR="/home/boll/backups/flervoice"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="flervoice"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
mongodump --db=$DB_NAME --out=$BACKUP_DIR/$DATE
```
Make sure to give executable permissions to the script:
```
chmod +x /home/boll/backup-flervoice.sh
```

## Updating
When a new version is available, update your repository and rebuild the application.

### Pull Latest Changes
Navigate to the repository directory:
```
cd /var/www/flervoice
```
Fetch and pull the latest changes (using your PAL as the password):
```
sudo git fetch origin
```
```
sudo git pull origin main
```
> [!IMPORTANT]
> a PAL (Personal Access Token) must be specified as the password. this can be created at https://github.com/settings/tokens

### Restart the Service
After rebuilding, restart the systemd service:
```
sudo systemctl restart flervoice
```
Verify the status:
```
sudo systemctl status flervoice
```
Check `Node.js` logiles:
```
sudo journalctl -fu flervoice
```