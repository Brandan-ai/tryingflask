# tryingflask

To run this application in GitHub codespaces you will need to run two commands in the root folder of the project.

pip install -r requirements.txt
and
python run.py

running these two commands in the terminal will generate a link to access the site on port 5000
if you want to run the test email server in the terminal, you will need to create a new terminal without closing the other, and run this command

python -m aiosmtpd -n -l localhost:1025

this will start a smtp server in the terminal

for all enquires ask ChatGPT
