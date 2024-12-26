POST /api/auth/register
Body: {
    "username": "player1",
    "password": "password123"
}

Copy

Insert at cursor
text
Login:

POST /api/auth/login
Body: {
    "username": "player1",
    "password": "password123"
}



fetch('http://localhost:3000/api/game/kill-monster', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer your_jwt_token_here'
    }