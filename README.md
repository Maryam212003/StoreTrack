Perfect! Let’s summarize **all the steps and installations needed to run your backend** for your StoreTrack project, combining everything we’ve done so far, including the low stock alarms and push notifications. I’ll make it step-by-step so you can just follow it.

---

## **1️⃣ Prerequisites**

* **Node.js** (v18+ recommended) and npm installed.
* **PostgreSQL** or your database (whatever you used with Prisma).
* **Docker** (optional but recommended for containerized setup).

---

## **2️⃣ Project Setup**

### **Install dependencies**

```bash
npm install express cors prisma @prisma/client nodemailer web-push
```

* `express` → backend framework
* `cors` → handle cross-origin requests
* `prisma` + `@prisma/client` → database ORM
* `nodemailer` → send emails
* `web-push` → push notifications

### **Dev dependencies**

```bash
npm install --save-dev nodemon
```

---

## **3️⃣ Prisma Setup**

1. Initialize Prisma (if not done yet):

```bash
npx prisma init
```

2. Configure `prisma/schema.prisma` with your database URL and models:

Example models:

```prisma
model Product {
  id         Int      @id @default(autoincrement())
  name       String
  stock      Int
  price      Float
  categoryId Int
  thruDate   DateTime?
  category   Category @relation(fields: [categoryId], references: [id])
  items      OrderItem[]
}

model Category {
  id          Int       @id @default(autoincrement())
  description String
  parentId    Int?
  children    Category[] @relation("CategoryChildren")
  products    Product[]
}

model Order {
  id        Int         @id @default(autoincrement())
  date      DateTime
  items     OrderItem[]
}

model OrderItem {
  id        Int      @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Float
  product   Product  @relation(fields: [productId], references: [id])
  order     Order    @relation(fields: [orderId], references: [id])
}

model StockHistory {
  id        Int      @id @default(autoincrement())
  productId Int
  change    Int
  type      String   // IN or OUT
  date      DateTime @default(now())
  product   Product  @relation(fields: [productId], references: [id])
}

model PushSubscription {
  id           Int    @id @default(autoincrement())
  subscription Json
}
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Apply migrations:

```bash
npx prisma migrate dev --name init
```

---

## **4️⃣ Environment Variables**

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/storetrack"
PORT=3000

EMAIL_USER="your_email@gmail.com"
EMAIL_PASS="your_email_password"

VAPID_PUBLIC_KEY="<YOUR_VAPID_PUBLIC_KEY>"
VAPID_PRIVATE_KEY="<YOUR_VAPID_PRIVATE_KEY>"
```

---

## **5️⃣ Backend Structure**

```
storetrack-backend/
├─ src/
│  ├─ app.js
│  ├─ prisma/
│  │   └─ prismaClient.js
│  ├─ routes/
│  │   ├─ productRoutes.js
│  │   ├─ categoryRoutes.js
│  │   ├─ orderRoutes.js
│  │   ├─ orderItemRoutes.js
│  │   ├─ stockHistoryRoutes.js
│  │   └─ reportRoutes.js
│  ├─ controllers/
│  │   ├─ productController.js
│  │   ├─ reportController.js
│  │   └─ lowStockJob.js
│  └─ notifications/
│      └─ pushController.js
└─ package.json
```

---

## **6️⃣ Low Stock Job**

* In `lowStockJob.js`, implement the check for stock ≤ threshold, send email using Nodemailer, and push notifications via `web-push`.
* Schedule it using `node-cron` or run manually with:

```bash
node src/controllers/lowStockJob.js
```

---

## **7️⃣ Start Backend**

**Option 1: Node directly**

```bash
node src/app.js
```

**Option 2: Nodemon (auto-reload)**

```bash
npx nodemon src/app.js
```

**Option 3: Docker**

**Dockerfile**

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "src/app.js"]
```

**docker-compose.yml**

```yaml
version: "3.8"
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: storetrack
    ports:
      - "5432:5432"
```

Run:

```bash
docker-compose up --build
```

---

## **8️⃣ Push Notifications**

* Save subscription in backend `/notifications/subscribe`.
* Register service worker in frontend (`sw.js`) and subscribe the user.
* On low stock, backend pushes notification to all subscribers.

---

## **9️⃣ Testing**

* Check `/` route → should return `"StoreTrack API is running"`.
* Check `/products`, `/orders`, `/categories`.
* Test low stock job → email + push notifications.

---

If you want, I can make a **ready-to-run `docker-compose` version with backend and database pre-configured**, so you just `docker-compose up` and everything works.

Do you want me to do that?
