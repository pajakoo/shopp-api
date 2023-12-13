// const https = require('https');
// const fs = require('fs');
//cmd+K+cmd+0 folding functions ( unfold  cmd+K +cmd+J )
// const { createProxyMiddleware } = require('http-proxy-middleware');
// brew services start mongodb-community@5.0
// brew services stop mongodb-community@5.0
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passportSetup = require("./passport");
const bodyParser = require('body-parser');
const Product = require('./models/Product');
const Price = require('./models/Price');
const Store = require('./models/Store');
const User = require('./models/User');
const Role = require('./models/Role');
const authRout = require('./routes/auth')

const CLIENT_URL = "deluxe-tapioca-7f56a1.netlify.app";//"http://localhost:3000/";
const cookieSession = require('cookie-session');
const session = require('express-session');
const express = require('express');
const passport = require('passport');


require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = 3333;
// const options = {
//   key:fs.readFileSync('key.pem'),
//   cert:fs.readFileSync('cert.pem')
// }

app.use(express.json());

// app.use(cookieSession({
//   name:"seesion",
//   keys:["lama"],
//   maxAge: 24*60*60*100
// }));

app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
    cookie: {
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // One Week
    }
  }))



app.use(cors({
  origin: CLIENT_URL,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));


app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));




passport.use(
  new GoogleStrategy(
    {
      clientID: "698649535640-7j0jm7jlscolg3gfdr7dkn0qs248jeep.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      //console.log(accessToken, refreshToken, profile, done);
      done(null, profile);
    }
  )
);



app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }) );
app.get("/auth/google/callback", passport.authenticate("google", {successRedirect: CLIENT_URL, failureRedirect: "/login/failed", }) );





  app.get("/auth/login/success", (req, res) => {
    res.status(200).json({
      success: true,
      message: "successfull"
    });
});

app.get("/auth/login/failed", (req, res) => {
  res.status(401).json({
    success: false,
    message: "failure",
  });
});


  app.get("/auth/logout", (req, res) => {
    
      req.logout();
      res.send("done");
  })

  

// app.use("/auth", authRout );


// app.use('/', createProxyMiddleware({ target: 'http://localhost:3000', changeOrigin: false }));
 





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_CONNECTION}@cluster0.udwqatw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
// const uri = "mongodb://localhost:27017/"




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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


const dbName = process.env.DB_NAME;
const db = client.db(dbName);

app.put('/api/users/:userId/roles', async (req, res) => {
  const { userId } = req.params;
  const { roles } = req.body;
  await client.connect();
  try {
    // Update user roles using updateOne
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { roles } }
    );

    if (result.modifiedCount > 0) {
      // Find the updated user and return it
      const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      res.json(updatedUser);
    } else {
      res.status(404).json({ error: 'User not found or roles not modified' });
    }
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/users', async (req, res) => {
  await client.connect();
  try {
    // Fetch all users from the 'users' collection in MongoDB
    const users = await db.collection('users').find().toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/userRoles', async (req, res) => {
  await client.connect();
  try {
    const rolesCollection = db.collection('role');

    const roles = await rolesCollection.find().toArray();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error fetching roles' });
  } finally {
    await client.close();
  }
});

app.post('/api/userInfo', async (req, res) => {
  const { user } = req.body;
  await client.connect();
  try {
    // Check if the user already exists in the database
    const existingUserCursor = await db.collection('users').find({ googleId: user.googleId });
    const existingUser = await existingUserCursor.next();

    if (!existingUser) {
      // If the user doesn't exist, create a new user
      const newUser = {
        sub: user.sub,
        name: user.name,
        email: user.email,
        roles: [new ObjectId('65660583e8d841f79b8fe615')]
      };

      // Insert the new user into the database
      await db.collection('users').insertOne(newUser);

      // Respond with user information
      res.json({
        sub: newUser.sub,
        name: user.name,
        email: newUser.email,
        roles: newUser.roles,
        // Add other fields as needed
      });
    } else {
      // If the user exists, respond with existing user information
      res.json({
        sub: existingUser.sub,
        name: user.name,
        email: existingUser.email,
        roles: existingUser.roles,
        // Add other fields as needed
      });
    }
  } catch (error) {
    console.error('Грешка при обработка на потребителската информация:', error.message);
    res.status(500).json({ error: 'Грешка при обработка на потребителската информация.' });
  }
});

app.get('/api/products', async (req, res) => {
  await client.connect();
  try {
    const collection = db.collection('products');
    const products = await collection.aggregate([
      {
        $lookup: {
          from: 'prices',
          localField: '_id',
          foreignField: 'product',
          as: 'priceData'
        }
      },
      {
        $unwind: {
          path: '$priceData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeData'
        }
      },
      {
        $unwind: {
          path: '$storeData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          barcode: 1,
          name: 1,
          location: 1,
          store: '$storeData.name',
          price: {
            $ifNull: ['$priceData.price', '$price']
          },
          date: {
            $ifNull: ['$priceData.date', null]
          }
        }
      }
    ]).toArray();
    res.json(products);
  } catch (err) {
    console.error('Грешка при търсене на продуктите', err);
    res.status(500).json({ error: 'Възникна грешка' });
  }
});

app.get('/api/stores', async (req, res) => {
  await client.connect();
  try {
    const collection = db.collection('stores');
    const stores = await collection.find({}, { name: 1 }).toArray();
    res.json(stores);
  } catch (error) {
    console.error('Грешка при извличане на магазините:', error);
    res.status(500).json({ error: 'Възникна грешка при извличане на магазините' });
  }
});

app.get('/api/products-client', async (req, res) => {
  await client.connect();
  try {
    const collection = db.collection('products');
    const products = await collection.aggregate([
      {
        $lookup: {
          from: 'prices',
          localField: '_id',
          foreignField: 'product',
          as: 'priceData'
        }
      },
      {
        $unwind: {
          path: '$priceData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeData'
        }
      },
      {
        $unwind: {
          path: '$storeData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$barcode',
          product: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: {
          newRoot: '$product'
        }
      },
      {
        $project: {
          _id: 1,
          barcode: 1,
          name: 1,
          location: 1,
          storeId: '$storeData._id',
          store: '$storeData.name',
          price: {
            $ifNull: ['$priceData.price', '$price']
          },
          date: {
            $ifNull: ['$priceData.date', null]
          }
        }
      }
    ]).toArray();
    res.json(products);
  } catch (err) {
    console.error('Грешка при търсене на продуктите', err);
    res.status(500).json({ error: 'Възникна грешка' });
  }
});

app.post('/api/cheapest', async (req, res) => {
  const productList = req.body;
  await client.connect();
  try {
    const storesCollection = db.collection('stores');
    const pricesCollection = db.collection('prices');

    // Find the stores that sell all of the products in the list
    const stores = await storesCollection.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'store',
          as: 'products',
        },
      },
      {
        $match: {
          'products.name': {
            $in: productList.map((product) => product.name),
          },
        },
      },
      {
        $addFields: {
          products: {
            $filter: {
              input: '$products',
              cond: { $in: ['$$this.name', productList.map((product) => product.name)] },
            },
          },
        },
      },
      {
        $match: {
          $expr: { $eq: [{ $size: '$products' }, productList.length] },
        },
      },
    ]).toArray();

    // Find the prices for the products in the list and sort by date in descending order
    const prices = await pricesCollection
      .find({
        product: {
          $in: productList.map((product) => product.id),
        },
      })
      .sort({ date: -1 })
      .toArray();

    // Group prices by store and get the latest date for each store
    const groupedPrices = {};
    prices.forEach((price) => {
      const storeId = price.store.toString();
      if (!groupedPrices[storeId] || price.date > groupedPrices[storeId].date) {
        groupedPrices[storeId] = price;
      }
    });

    // Calculate the total price for each store using the most up-to-date price
    const storePrices = stores.map((store) => {
      const storeProducts = store.products;
      const price = groupedPrices[store._id.toString()];
      const productPrices = price ? price.prices : [];
      const totalPrice = productList.reduce((acc, product) => {
        const storeProduct = storeProducts.find((p) => p.name === product.name);
        const productPrice = productPrices.find((p) => p.product.toString() === product.id.toString());
        const priceValue = productPrice ? productPrice.price : storeProduct ? storeProduct.price : 0;
        return acc + Number(priceValue);
      }, 0);

      return {
        storeId: store._id,
        store: store.name,
        latitude: store.location.lat,
        longitude: store.location.lng,
        totalPrice,
      };
    });

    // Sort the store prices by total price
    storePrices.sort((a, b) => a.totalPrice - b.totalPrice);

    res.json(storePrices);
  } catch (error) {
    console.error('Error finding the cheapest prices:', error);
    res.status(500).json({ error: 'An error occurred while finding the cheapest prices' });
  }
});

app.get('/api/searchProduct', async (req, res) => {
  const { code } = req.query;
  await client.connect();
  try {
    // Make the request to the external API
    const response = await axios.get(`https://barcode.bazadanni.com/json/${code}`);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/product/:barcode/prices/:storeId', async (req, res) => {
  const { barcode, storeId } = req.params;
  await client.connect();
  try {
    const product = await db.collection('products').findOne({ barcode, store: new ObjectId(storeId) });

    if (!product) {
      return res.status(404).json({ message: 'Продуктът не е намерен' });
    }

    const prices = await db.collection('prices').find({ product: product._id }).toArray();

    res.json(prices);
  } catch (error) {
    console.error('Грешка при извличане на цените за продукта:', error);
    res.status(500).json({ message: 'Възникна грешка при извличане на цените за продукта' });
  }
});

app.get('/api/product/:barcode/history', async (req, res) => {
  const { barcode } = req.params;
  await client.connect();
  try {
    const products = await db.collection('products').find({ barcode }).toArray();

    if (products.length === 0) {
      return res.status(404).json({ message: 'Продуктите не са намерени' });
    }

    const productIds = products.map((product) => product._id);

    const prices = await db.collection('prices').find({ product: { $in: productIds } }).toArray();

    res.json(prices);
  } catch (error) {
    console.error('Грешка при намиране на ценовата история:', error);
    res.status(500).json({ message: 'Възникна грешка при намиране на ценовата история' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  await client.connect();
  try {
    const db = client.db('ShoppingApp');

    // Delete the product
    await db.collection('products').deleteOne({ _id: new ObjectId(productId) });

    // Delete the associated price
    await db.collection('prices').deleteOne({ product: new ObjectId(productId) });

    res.json({ message: 'Продуктът и свързаната цена са изтрити успешно' });
  } catch (error) {
    console.error('Грешка при изтриване на продукта и цената:', error);
    res.status(500).json({ message: 'Възникна грешка при изтриване на продукта и цената' });
  }
});

app.get('/api/products/:barcode', async (req, res) => {
  await client.connect();
  try {
    const product = await db.collection('products').findOne({ barcode: req.params.barcode });

    if (!product) {
      return res.status(404).json({ message: 'Продуктът не е намерен' });
    }

    res.json(product);
  } catch (error) {
    console.error('Грешка при намиране на продукта:', error);
    res.status(500).json({ message: 'Възникна грешка при намиране на продукта' });
  }
});
app.post('/api/products', async (req, res) => {
  const { barcode, name, price, store, location } = req.body;
  await client.connect();
  try {
    const collection = db.collection('products');

    const existingStore = await db.collection('stores').findOne({ name: store });

    if (existingStore) {
      const existingProduct = await collection.findOne({ barcode, store: existingStore._id });

      if (existingProduct) {
        existingProduct.price = price;
        existingProduct.location = location;
        await collection.updateOne({ _id: existingProduct._id }, { $set: existingProduct });

        const priceData = {
          store: existingProduct.store,
          product: existingProduct._id,
          date: Date.now(),
          price: existingProduct.price
        };
        await db.collection('prices').insertOne(priceData);

        res.json({ message: 'Продуктът е обновен успешно' });
      } else {
        const productData = {
          barcode,
          name,
          price,
          store: existingStore._id,
          location
        };
        await collection.insertOne(productData);

        const priceData = {
          store: existingStore._id,
          product: productData._id,
          date: Date.now(),
          price: productData.price
        };
        await db.collection('prices').insertOne(priceData);

        res.status(201).json({ message: 'Продуктът е успешно създаден' });
      }
    } else {
      const storeData = {
        name: store,
        location
      };
      const newStore = await db.collection('stores').insertOne(storeData);

      const productData = {
        barcode,
        name,
        price,
        store: newStore.insertedId,
        location
      };
      await collection.insertOne(productData);

      const priceData = {
        store: newStore.insertedId,
        product: productData._id,
        date: Date.now(),
        price: productData.price
      };
      await db.collection('prices').insertOne(priceData);

      res.status(201).json({ message: 'Продуктът е успешно създаден' });
    }
  } catch (error) {
    console.error('Грешка при създаване/обновяване на продукта:', error);
    res.status(500).json({ message: 'Възникна грешка при създаване/обновяване на продукта' });
  }
});


// const server = https.createServer(options, app);
// server.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});















// app.use(require('express-session')({ secret: process.env.GOOGLE_CLIENT_SECRET, resave: true, saveUninitialized: true }));
// app.use(passport.initialize());
// app.use(passport.session());

//app.get('/auth/google', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

// app.get(
//   '/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/' }),
//   async (req, res) => {
//     await client.connect();
//     try {
//       // Check if the user already exists in the database
//       const existingUserCursor = await db.collection('users').find({ googleId: req.user.id });
//       const existingUser = await existingUserCursor.next();

//       if (!existingUser) {
//         // If the user doesn't exist, create a new user
//         const newUser = {
//           googleId: req.user.id,
//           name: req.user.displayName,
//           email: '',
//           roles: [new ObjectId('65660583e8d841f79b8fe615')]
//         };

//         // Insert the new user into the database
//         await db.collection('users').insertOne(newUser);
//       }
//     } catch { }
//     await client.close();
//     // Successful authentication, redirect to the client app\
//     res.redirect('http://localhost:3000'); // Adjust as needed
//   }
// );


