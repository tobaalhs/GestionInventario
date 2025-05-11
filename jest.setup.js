// jest.setup.js

const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
   global.TextDecoder = TextDecoder;
}

jest.mock('./src/firebase/config', () => ({ // <-- RUTA CORREGIDA
   auth: {
       onAuthStateChanged: jest.fn(callback => {
           callback(null);
           return jest.fn();
       }),
       signInWithEmailAndPassword: jest.fn(),
       currentUser: null,
   },
   db: {
       collection: jest.fn(() => ({
           doc: jest.fn(() => ({
               get: jest.fn(() => Promise.resolve({ exists: false, data: () => undefined })),
               set: jest.fn(() => Promise.resolve()),
           })),
       })),
       doc: jest.fn(() => ({
           get: jest.fn(() => Promise.resolve({ exists: false, data: () => undefined })),
           set: jest.fn(() => Promise.resolve()),
       })),
   },
}));