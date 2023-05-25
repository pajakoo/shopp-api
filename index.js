const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const Product = require('./models/Product');
const Barcode = require('./models/Barcode');

const app = express();
const port = 3333;

app.use(express.json());
app.use(cors()); // Add CORS middleware

const uri = "mongodb+srv://georgievkn82:S2UNdFGTzPCVz9TE@cluster0.udwqatw.mongodb.net/ShoppingApp?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the database');
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const db = client.db('ShoppingApp');
    const products = await db.collection('products').find().toArray();
    res.json(products);
  } catch (err) {
    console.error('Грешка при търсене на продуктите', err);
    res.status(500).json({ error: 'Възникна грешка' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const db = client.db('ShoppingApp');

    await db.collection('products').deleteOne({ _id: ObjectId(productId) });
    await db.collection('barcodes').deleteMany({ product: ObjectId(productId) });

    res.json({ message: 'Продуктът е изтрит успешно' });
  } catch (error) {
    console.error('Грешка при изтриване на продукта:', error);
    res.status(500).json({ message: 'Възникна грешка при изтриване на продукта' });
  }
});

app.get('/api/products/:barcode', async (req, res) => {
  try {
    const db = client.db('ShoppingApp');
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
    const db = client.db('ShoppingApp');
    const existingProduct = await db.collection('products').findOne({ barcode, store });

    if (existingProduct) {
      existingProduct.price = price;
      existingProduct.location = location;
      await db.collection('products').updateOne({ _id: existingProduct._id }, { $set: existingProduct });
      res.json({ message: 'Продуктът е обновен успешно' });
    } else {
      const newProduct = { barcode, name, price, store, location };
      const result = await db.collection('products').insertOne(newProduct);
      const newBarcode = { code: barcode, product: result.insertedId };
      await db.collection('barcodes').insertOne(newBarcode);
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
