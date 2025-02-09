const request = require('supertest');
const app = require('../index'); // Adjust the path to your app

describe('Authentication Endpoints', () => {
    it('should authenticate user', async () => {
        const res = await request(app)
            .post('/api/authenticate')
            .send({
                username: 'testuser',
                password: 'testpassword',
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });
});