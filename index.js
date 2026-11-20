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

app.get("/get-all-services", async (req, res) => {
  const query = {};
  const result = await services.find(query).toArray();

  res.status(200).send({
    status: 200,
    message: "successfully retrive all services",
    result,
  });
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

// add booking api

app.post("/add-booking", async (req, res) => {
  const payload = req.body;
  const { customerEmail, technicianEmail, serviceId } = payload;
  const query = { customerEmail, technicianEmail, serviceId };
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
  console.log(data);
  const result = await services.insertOne(data);
  res
    .status(200)
    .send({
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

  res
    .status(200)
    .send({
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

  res
    .status(200)
    .send({
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

  res
    .status(200)
    .send({
      status: 200,
      success: true,
      message: "successfully update service",
      result,
    });
});

app.listen(PORT, () => {
  console.log("server is working fine...");
});
