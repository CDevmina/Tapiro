const request = require('supertest');
const express = require('express');
const { auth, validateToken } = require('../../middleware/authMiddleware');
const { connectDB } = require('../../utils/mongoUtil');
const { connectRedis } = require('../../utils/redisUtil');
const authenticationController = require('../../controllers/Authentication');

// Create an express app instance
const app = express();
app.use(express.json());

// Apply auth middleware
app.use(auth);
app.use('/users', validateToken);

// Define routes (example)
app.post('/users', authenticationController.usersPOST);
app.get('/users/:userId', authenticationController.usersUserIdGET);
app.put('/users/:userId', authenticationController.usersUserIdPUT);
app.delete('/users/:userId', authenticationController.usersUserIdDELETE);

describe('Authentication Integration Tests', () => {
    beforeAll(async () => {
        await connectDB();
        await connectRedis();
    });

    it('should register a new user', async () => {
        const newUser = {
            email: 'test@example.com',
            password: 'password123',
            role: 'customer',
        };

        const response = await request(app)
            .post('/users')
            .send(newUser);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(newUser.email);
    });
});