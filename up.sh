# In case of Container startup failure
# docker-compose build --no-cache

# Start the development environment
docker-compose up --build

# View logs
docker-compose logs -f