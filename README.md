
  # Fire Department Visualization Tool

  This is a code bundle for Fire Department Visualization Tool. The original project is available at https://www.figma.com/design/zruflYr4n3tQyJO2bcrxnk/Fire-Department-Visualization-Tool.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  npm install leaflet

  ## RHEL8
  
  sudo dnf module enable nodejs:16
sudo dnf install nodejs
cd /path/to/fire_demo3
npm install
npm install leaflet
npm run dev

If you encounter permission issues, use sudo for npm commands or configure npm to avoid global permissions issues:

npm config set prefix ~/.npm
export PATH=$PATH:~/.npm/bin