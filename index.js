require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bodyParser = require('body-parser');
const Product = require('./models/Product');
const Price = require('./models/Price');
const Store = require('./models/Store');

const app = express();
const port = 3333;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_CONNECTION}@cluster0.udwqatw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
//const uri = "mongodb://localhost:27017/"
const client = new MongoClient(uri);

client.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the database');
  }
});
const dbName = process.env.DB_NAME;
const db = client.db(dbName);

app.get('/api/products', async (req, res) => {
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

app.get('/api/products-client', async (req, res) => {
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
  try {
    // Make the request to the external API
    const response = await axios.get(`https://barcode.bazadanni.com/json/${code}`);
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const db = client.db('ShoppingApp');

    await db.collection('products').deleteOne({ _id: new ObjectId(productId) });
    await db.collection('barcodes').deleteMany({ product: new ObjectId(productId) });

    res.json({ message: 'Продуктът е изтрит успешно' });
  } catch (error) {
    console.error('Грешка при изтриване на продукта:', error);
    res.status(500).json({ message: 'Възникна грешка при изтриване на продукта' });
  }
});


app.get('/api/products/:barcode', async (req, res) => {
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




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


//brew services stop mongodb-community@5.0
