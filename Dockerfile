FROM node:alpine
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm install

# Copy the entire codebase to the working directory
COPY . /app/

# Expose the port your app runs on (replace <PORT_NUMBER> with your app's actual port)
EXPOSE 3000

# Define the command to start your application (replace "start" with the actual command to start your app)
CMD ["npm", "start"]

