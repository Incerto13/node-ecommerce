FROM node:latest
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app # specifying the working dir inside container
COPY package.json /usr/src/app
ENV NODE_ENV production
RUN npm install
# copy ALL current dir's content to container's workdir  
COPY . . 
# port that container will expose to the CPU (should match port that express is running on app)
EXPOSE 3000 
CMD [ "npm", "start" ] 
