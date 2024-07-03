const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

let currentCommand = "STOP"; // Comando inicial
let currentRiegoStatus = 0

let clients = []; // Lista de clientes conectados
let currentDatos = { humedad: 0, temperatura: 0, riegoActivo: 0 }; // Datos inicial
let currentProgramacionRiego = { humedad: -1, horaInicio: -1 }; // Programacion de riego inicial

let requestQueue = []; // Cola de peticiones
let isProcessing = false; // Indicador de si la cola está siendo procesada

const processQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;
  while (requestQueue.length > 0) {
    const { req, res, next } = requestQueue.shift();
    try {
      await handleRequest(req, res, next);
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).send('Internal Server Error');
    }
  }
  isProcessing = false;
};

// Middleware para agregar peticiones a la cola
const queueMiddleware = (req, res, next) => {
  requestQueue.push({ req, res, next });
  processQueue();
};

// Función para manejar las peticiones
const handleRequest = async (req, res, next) => {
  // Lógica para manejar las peticiones según el endpoint
  next();
};

// Aplicar el middleware de cola a todas las rutas
app.use(queueMiddleware);

app.post('/setDatos', (req, res) => {
  const humedad = req.body.humedad;
  const temperatura = req.body.temperatura;
  const riegoActivo = req.body.riegoActivo;
  console.log(`Datos set to ${humedad}, ${temperatura}, Riego Activo: ${riegoActivo}`);
  currentDatos = { humedad: humedad, temperatura: temperatura, riegoActivo: riegoActivo};
  currentRiegoStatus = riegoActivo;
  res.status(200).send(`Datos set to ${humedad}, ${temperatura}, Riego Activo: ${riegoActivo}`);
});

app.get('/getDatos', (req, res) => {
  console.log("Enviando Datos: ", currentDatos);
  res.status(200).json({
    humedad: currentDatos.humedad,
    temperatura: currentDatos.temperatura,
    riegoActivo: currentRiegoStatus // Añadir el estado del riego
  });
});


// Endpoint para actualizar el comando
app.post('/setCommand', (req, res) => {
  const command = req.body.command;
  console.log(command);
  if (command === "START" || command === "STOP") {
    currentCommand = command;

    // Resetear la programación de riego
    currentProgramacionRiego = { humedad: -1, horaInicio: -1 };
    console.log('Programación de riego eliminada debido a comando manual');

    res.status(200).send(`Command set to ${command}`);
    // Notificar a todos los clientes conectados
    clients.forEach(client => client.res.write(`data: ${command}\n\n`));
  } else {
    res.status(400).send('Invalid command');
  }
});

// Endpoint para obtener el comando actual por SSE
app.get('/getCommand', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Enviar los encabezados al cliente

  // Enviar el comando actual al conectarse
  res.write(`data: ${currentCommand}\n\n`);

  // Almacenar el cliente conectado
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  // Remover el cliente cuando se desconecta
  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

app.get('/getCommandIT', (req, res) => {
  res.send(currentCommand);
});

app.get('/getProgramacionRiegoIT', (req, res) => {
  res.send(currentProgramacionRiego);
});

app.get('/getProgramacionRiego', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify(currentProgramacionRiego)}\n\n`);

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

app.post('/setProgramacionRiego', (req, res) => {
  const {
    humedad,
    startTime,
  } = req.body;
  console.log(`Datos set to ${humedad}, ${startTime}`);
  currentProgramacionRiego = {
    humedad,
    startTime,
  };
  res.status(200).json({ humedad: humedad, startTime: startTime });

  clients.forEach(client => client.res.write(`data: ${JSON.stringify(currentProgramacionRiego)}\n\n`));
});

app.listen(PORT, () => {
  console.log(`app is running on port ${PORT}`);
});
