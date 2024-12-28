const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// job_hunter
// Q5dgm6z8aOQ3y0GN

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://job-portal-c6c0d.web.app',
    'https://job-portal-c6c0d.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ massege: 'Unothorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massege: 'Unothorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ucdi4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const jobsCollection = client.db('JobPortal').collection('jobs')

    const jobApplicationCollection = client.db('JobPortal').collection('job_applications')

    // Auth related APIs:
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true })
    })

    app.post('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true })
    })



    // job related APIs
    app.get('/jobs', async (req, res) => {
      const email = req.query.email;
      const sort = req.query?.sort;
      const search = req.query?.search;
      const min = req.query?.minSalary;
      const max = req.query?.maxSalary;

      let query = {}
      let sortQuery = {}

      if (email) {
        query = { hr_email: email }
      }
      if(sort == "true"){
        sortQuery = { 'salaryRange.min': -1}
      }
      if(search){
        query.location = { $regex: search, $options: "i" }
      }
      if(min && max){
        query = {
          ...query,
          "salaryRange.min": { $gte: parseInt(min)},
          "salaryRange.max": { $lte: parseInt(max)}
        }
      }
      const cursor = jobsCollection.find(query).sort(sortQuery);
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result)
    })

    app.post('/jobs', async (req, res) => {
      const newJobs = req.body;
      const result = await jobsCollection.insertOne(newJobs)
      res.send(result)
    })


    // job applications related APIs
    app.post('/job-applications', async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      res.send(result)
    })

    app.get('/job-application', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "access forbiden" })
      }
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/job-applications/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId }
      const result = await jobApplicationCollection.find(query).toArray()
      res.send(result)
    })

    app.patch('/job-applications/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await jobApplicationCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('job is falling from sky')
})

app.listen(port, () => {
  console.log(`job  is falling from ${port}`)
})