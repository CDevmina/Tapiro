# In case of fastAPI startup failure
# docker-compose build --no-cache ml-service

# Start the development environment
docker-compose up --build

# View logs
docker-compose logs -f