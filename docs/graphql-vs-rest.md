# GraphQL vs REST — So sánh cùng feature

## Ví dụ: Lấy danh sách order kèm tên user

### REST

```http
GET /api/v1/orders
```

Response luôn trả full object — kể cả fields client không cần:

```json
{
  "data": [
    {
      "id": 1,
      "userId": 42,
      "status": "PENDING_PAYMENT",
      "paymentStatus": "PENDING",
      "paymentMethod": "COD",
      "shippingFee": 30000,
      "totalAmount": 500000,
      "finalAmount": 530000,
      "createdAt": "2026-06-11T10:00:00Z"
    }
  ]
}
```

Muốn lấy thêm tên user → gọi thêm endpoint khác, hoặc service tự join:

```http
GET /api/v1/users/42
```

→ **2 round trips**, hoặc service phải biết trước client cần gì để JOIN sẵn.

---

### GraphQL

```graphql
query {
  orders {
    id
    status
    finalAmount
    user {
      name
      email
    }
  }
}
```

Client chọn đúng field cần — không thừa, không thiếu. `user` được resolve qua **DataLoader** (batch 1 query `WHERE id IN (...)` thay vì N queries riêng).

---

## So sánh theo tiêu chí

| Tiêu chí | REST | GraphQL |
|---|---|---|
| **Overfetch** | Luôn trả full object | Client chọn đúng field |
| **Underfetch** | Cần nhiều endpoint/round trips | Lấy nested data trong 1 query |
| **N+1 query** | Không có (service tự JOIN) | Có nếu không dùng DataLoader |
| **HTTP Caching** | Native (GET có thể cache CDN) | Khó — mọi query đều POST |
| **Type safety** | Swagger/OpenAPI (manual) | Schema tự generate, tự document |
| **Real-time** | Cần SSE hoặc WebSocket riêng | Subscriptions built-in |
| **Error format** | HTTP status code chuẩn | Luôn 200, lỗi nằm trong `errors[]` |
| **Versioning** | URL versioning (`/v1`, `/v2`) | Deprecate field, không break client |
| **Tooling** | Mature (Postman, curl) | GraphQL Playground, Apollo Studio |
| **Learning curve** | Thấp | Cao hơn (schema, resolvers, DataLoader) |

---

## Khi nào dùng cái nào

**Dùng REST khi:**
- API public cho bên thứ 3 — chuẩn HTTP quen thuộc, dễ document
- Cần HTTP caching mạnh (CDN, browser cache)
- Team chưa quen GraphQL
- CRUD đơn giản, ít nested data

**Dùng GraphQL khi:**
- Client đa dạng (web, mobile) cần data shape khác nhau
- Nhiều nested relation cần lấy trong 1 request
- Real-time (subscriptions) là core feature
- BFF (Backend For Frontend) — aggregate nhiều service

---

## Cách project này dùng

REST và GraphQL **song song**, không thay thế nhau:

- **REST** (`/api/v1/...`): mutations (checkout, deposit, cancel order), webhook, upload — những thứ cần HTTP status rõ ràng và idempotency key
- **GraphQL** (`/graphql`): queries (product list, order detail, me) và subscription real-time order status

Pattern này gọi là **hybrid API** — tận dụng điểm mạnh của cả hai.

---

## DataLoader — tại sao bắt buộc với GraphQL

Không có DataLoader, query `orders { user { name } }` với 10 orders sẽ chạy 11 queries:

```
SELECT * FROM orders          -- 1 query
SELECT * FROM users WHERE id = 1   -- lần 1
SELECT * FROM users WHERE id = 2   -- lần 2
...                                -- x10
```

Với DataLoader, tất cả userId được **batch** lại:

```
SELECT * FROM orders
SELECT * FROM users WHERE id IN (1, 2, 3, ..., 10)  -- 1 query duy nhất
```

DataLoader còn **deduplicate** — cùng userId xuất hiện nhiều lần chỉ query 1 lần.
