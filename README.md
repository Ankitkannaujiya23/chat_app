# Chat Backend

Node.js + TypeScript (strict) chat backend. MySQL stores users, chats and chat members. Firebase Firestore stores messages, read receipts and last seen markers.

## Setup

1. Install dependencies

```
npm install
```

2. Create the database

```
mysql -u root -p < schema.sql
```

3. Download a Firebase service account key (Firebase Console, Project Settings, Service accounts, Generate new private key) and save it as `serviceAccountKey.json` in the project root. Make sure Firestore is enabled for the project.

4. Configure environment

```
cp .env.example .env
```

5. Run

```
npm run dev
```

Production build: `npm run build && npm start`

## Firestore layout

```
chats/{chatId}/messages/{messageId}   senderId, text, createdAt, editedAt, deleted, readBy{userId: timestamp}
chats/{chatId}/lastSeen/{userId}      messageId, updatedAt
```

## API

| Method | Path | Body / Query |
| --- | --- | --- |
| POST | /users | name, email |
| POST | /chat/create | userAId, userBId |
| POST | /chat/:chatId/message/send | senderId, text |
| GET | /chat/:chatId/messages?limit=50 | |
| POST | /chat/:chatId/message/:messageId/read | userId |
| POST | /chat/:chatId/lastseen | userId, messageId |
| GET | /user/:userId/chats | |
| PATCH | /chat/:chatId/message/:messageId | senderId, text |
| DELETE | /chat/:chatId/message/:messageId | senderId |

## Example

```
curl -X POST localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Asha","email":"asha@example.com"}'
curl -X POST localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Ravi","email":"ravi@example.com"}'
curl -X POST localhost:3000/chat/create -H "Content-Type: application/json" -d '{"userAId":1,"userBId":2}'
curl -X POST localhost:3000/chat/1/message/send -H "Content-Type: application/json" -d '{"senderId":1,"text":"Hello"}'
curl "localhost:3000/chat/1/messages?limit=50"
curl -X POST localhost:3000/chat/1/message/<messageId>/read -H "Content-Type: application/json" -d '{"userId":2}'
curl -X POST localhost:3000/chat/1/lastseen -H "Content-Type: application/json" -d '{"userId":2,"messageId":"<messageId>"}'
curl localhost:3000/user/1/chats
```
