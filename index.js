import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongodbClient = await connectToMongoDB();
const db = mongodbClient.db("fixMate");
const services = db.collection("services");
const bookings = db.collection("bookings");
const payments = db.collection("payments");
const user = db.collection("user");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send({ message: "server is running...!" });
});

// UI mode value -> the label stored on the service document.
const SERVICE_MODE_LABEL = {
  "home-visit": "Home Visit",
  "shop-drop-off": "Shop Drop-off",
};

// Whitelisted sorts; unknown values fall back to newest.
const SERVICE_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  "price-asc": { basePrice: 1 },
  "price-desc": { basePrice: -1 },
  "title-asc": { title: 1 },
};

const firstQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
};

app.get("/get-all-services", async (req, res) => {
  const query = {
    approvalStatus: {
      $nin: ["pending", "rejected"],
    },
  };

  const search = firstQueryValue(req.query.search).trim();
  const category = firstQueryValue(req.query.category);
  const mode = firstQueryValue(req.query.mode);
  const sort = firstQueryValue(req.query.sort);

  if (category) {
    query.category = category;
  }

  if (SERVICE_MODE_LABEL[mode]) {
    query.serviceMode = SERVICE_MODE_LABEL[mode];
  }

  if (search) {
    // Escape user input so it is matched literally instead of as a regex.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Case-insensitive match across every field customers search by.
    const pattern = new RegExp(escaped, "i");

    query.$or = [
      { title: pattern },
      { description: pattern },
      { serviceArea: pattern },
      { category: pattern },
    ];
  }

  try {
    const result = await services
      .find(query)
      .sort(SERVICE_SORTS[sort] || SERVICE_SORTS.newest)
      .toArray();

    res.status(200).send({
      status: 200,
      message: "successfully retrive all services",
      result,
    });
  } catch (error) {
    res.status(500).send({
      status: 500,
      message: "failed to retrive all services",
      error: error.message,
    });
  }
});

app.get("/get-single-service/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const result = await services.findOne(query);

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully retrive single services",
    result,
  });
});

app.patch("/update-status/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body;
  const query = { _id: new ObjectId(id) };

  const result = await bookings.updateOne(query, {
    $set: status,
  });

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update booking  status",
    result,
  });
});

// add booking api

app.post("/add-booking", async (req, res) => {
  const payload = req.body;
  const { customerEmail, technicianEmail, serviceId } = payload;
  const query = {
    customerEmail,
    technicianEmail,
    serviceId,
    status: { $ne: "cancelled" },
  };
  const exist = await bookings.countDocuments(query);
  if (exist === 0) {
    const result = await bookings.insertOne(payload);

    res.status(200).send({
      status: 200,
      success: true,
      message: "successfully post booking  data",
      result,
    });

    return;
  }

  res.status(500).send({
    status: 500,
    success: false,
    message: "Inrernal server error",
    result: { message: "can't add booking data . it's already exist" },
  });
});

// technician api here ->

app.post("/add-service", async (req, res) => {
  const data = req.body;
  const result = await services.insertOne(data);
  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully post data",
    result,
  });
});

app.get("/get-services/:email", async (req, res) => {
  const email = req.params.email;
  const query = { technicianEmail: email };
  const result = await services.find(query).toArray();

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully data retrive",
    result,
  });
});

app.delete("/delete-service/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await services.deleteOne(query);

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully delete sercive",
    result,
  });
});

app.patch("/update-service/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const result = await services.updateOne(query, {
    $set: data,
  });

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update service",
    result,
  });
});

app.patch("/update-service-isavailable/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const query = { _id: new ObjectId(id) };
  const result = await services.updateOne(query, {
    $set: data,
  });

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update service",
    result,
  });
});

// Statuses exposed by the technician filter. Keep in sync with FILTER_OPTIONS
// in src/components/dashboard/technician/booking-management.tsx.
const BOOKING_STATUSES = ["requested", "accepted", "in-progress", "completed"];

app.get("/get-booking-req/:email", async (req, res) => {
  const email = req.params.email;
  const query = { technicianEmail: email };

  // Unknown statuses are ignored so the listing falls back to "all".
  const status = firstQueryValue(req.query.status);

  if (BOOKING_STATUSES.includes(status)) {
    query.status = status;
  }

  try {
    const result = await bookings.find(query).toArray();

    res.status(200).send({
      status: 200,
      success: true,
      message: "successfully retrive booking requests",
      result,
    });
  } catch (error) {
    res.status(500).send({
      status: 500,
      success: false,
      message: "failed to retrive booking requests",
      error: error.message,
    });
  }
});

app.patch("/update-status-by-technician/:id", async (req, res) => {
  const id = req.params.id;
  const status = req.body;
  const query = { _id: new ObjectId(id) };

  const result = await bookings.updateOne(query, {
    $set: status,
  });

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update booking  status",
    result,
  });
});

// customer api here

app.get("/get-bookings/:email", async (req, res) => {
  const email = req.params.email;
  const query = { customerEmail: email };

  const result = await bookings.find(query).toArray();

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update service",
    result,
  });
});

// admin api here

app.get("/get-all-users", async (req, res) => {
  const queryData = req.query;
  const query = {};
  const result = await user.find(query).toArray();

  res.status(200).send({
    status: 200,
    success: true,
    message: "successfully update service",
    result,
  });
});

// Roles an admin may assign. Keep in sync with ROLE_OPTIONS in
// src/components/dashboard/admin/admin-users.tsx.
const USER_ROLES = ["customer", "technician", "admin"];

// This account's role is fixed. The check runs before any database lookup, so
// every requested role is rejected for it.
const PROTECTED_ADMIN_EMAIL = "admin@fixmate.com";

// The Next server calls this route with a server-only key, so browsers cannot
// reach it directly. Fail closed when the key is not configured.
const requireAdminApiKey = (req, res, next) => {
  const expected = process.env.ADMIN_API_KEY;
  const provided = req.get("x-admin-api-key") ?? "";

  if (!expected || provided !== expected) {
    return res.status(401).send({
      status: 401,
      success: false,
      message: "Unauthorized.",
    });
  }

  next();
};

app.patch("/update-role-by-admin", requireAdminApiKey, async (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const role = req.body?.role;

  if (!email) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "A user email is required.",
    });
  }

  if (!USER_ROLES.includes(role)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid role.",
    });
  }

  if (email === PROTECTED_ADMIN_EMAIL) {
    return res.status(403).send({
      status: 403,
      success: false,
      message: "This account's role cannot be changed.",
    });
  }

  try {
    // Only `role` is written; extra body fields are ignored.
    const result = await user.updateOne({ email }, { $set: { role } });

    if (result.matchedCount === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).send({
      status: 200,
      success: true,
      message: "successfully update user role",
      result: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).send({
      status: 500,
      success: false,
      message: "failed to update user role",
      error: error.message,
    });
  }
});

// Approval statuses the admin page can filter by. Unknown values are ignored
// so the listing falls back to every service.
const ADMIN_APPROVAL_STATUSES = ["pending", "approved", "rejected"];

// Review order: pending first, then rejected, then approved.
const ADMIN_APPROVAL_PRIORITY = {
  pending: 0,
  rejected: 1,
  approved: 2,
};

app.get("/get-all-services-by-admin", async (req, res) => {
  const query = {};

  // Validated filters combine with AND; the admin page currently exposes
  // approval status, and additional filters can be added here.
  const approvalStatus = firstQueryValue(req.query.approvalStatus);

  if (ADMIN_APPROVAL_STATUSES.includes(approvalStatus)) {
    query.approvalStatus = approvalStatus;
  }

  try {
    // Sorting lives on the server too: pending listings are reviewed first.
    const result = await services
      .aggregate([
        { $match: query },
        {
          $addFields: {
            approvalPriority: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$approvalStatus", "pending"] },
                    then: ADMIN_APPROVAL_PRIORITY.pending,
                  },
                  {
                    case: { $eq: ["$approvalStatus", "rejected"] },
                    then: ADMIN_APPROVAL_PRIORITY.rejected,
                  },
                ],
                default: ADMIN_APPROVAL_PRIORITY.approved,
              },
            },
          },
        },
        { $sort: { approvalPriority: 1, createdAt: -1 } },
        { $project: { approvalPriority: 0 } },
      ])
      .toArray();

    res.status(200).send({
      status: 200,
      success: true,
      message: "successfully retrive services",
      result,
    });
  } catch (error) {
    res.status(500).send({
      status: 500,
      success: false,
      message: "failed to retrive services",
      error: error.message,
    });
  }
});

// Booking statuses the admin listing can filter by. Unknown values are ignored.
const ADMIN_BOOKING_STATUSES = [
  "requested",
  "accepted",
  "in-progress",
  "completed",
  "rejected",
  "cancelled",
];

// Whitelisted admin sorts; unknown values fall back to newest first.
const ADMIN_BOOKING_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  "date-asc": { preferredDate: 1 },
  "date-desc": { preferredDate: -1 },
  "amount-asc": { basePrice: 1 },
  "amount-desc": { basePrice: -1 },
};

app.get("/get-bookings-by-admin", async (req, res) => {
  const query = {};

  const status = firstQueryValue(req.query.status);

  if (ADMIN_BOOKING_STATUSES.includes(status)) {
    query.status = status;
  }

  const search = firstQueryValue(req.query.search).trim();

  if (search) {
    // Escape user input so it is matched literally instead of as a regex.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");

    query.$or = [
      { serviceTitle: pattern },
      { customerName: pattern },
      { customerEmail: pattern },
      { technicianName: pattern },
      { technicianEmail: pattern },
      { phone: pattern },
      { address: pattern },
    ];
  }

  const sort = firstQueryValue(req.query.sort);

  try {
    const result = await bookings
      .find(query)
      .sort(ADMIN_BOOKING_SORTS[sort] || ADMIN_BOOKING_SORTS.newest)
      .toArray();

    res.status(200).send({
      status: 200,
      success: true,
      message: "successfully retrive bookings",
      result,
    });
  } catch (error) {
    res.status(500).send({
      status: 500,
      success: false,
      message: "failed to retrive bookings",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("server is working fine...");
});
