# Docker prune before starting
# docker builder prune -a -f

# Hard cache and system prune
# docker system prune -a -f

# In case of Container startup failure
# docker-compose build --no-cache ml-service

# Start the development environment
docker-compose up --build

# View logs
docker-compose logs -f