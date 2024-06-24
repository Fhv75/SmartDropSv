const express = require('express')
const cors = require('cors')

const app = express()

const PORT = process.env.PORT || 3000

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

let currentCommand = "STOP"; // Comando inicial
let clients = []; // Lista de clientes conectados
let currentDatos = {humedad: 0, temperatura: 0}; // Datos inicial
let currentProgramacionRiego = {humedad: -1,horaInicio: -1}; // Programacion de riego inicial

app.post('/setDatos', (req, res) => {
  const humedad = req.body.humedad;
  const temperatura = req.body.temperatura
  console.log(`Datos set to ${humedad}, ${temperatura}`)
  currentDatos = {humedad: humedad, temperatura: temperatura};
  res.status(200).send(`Datos set to ${humedad}, ${temperatura}`);
});

app.get('/getDatos', (req, res) => {
  console.log("Enviando Datos: ", currentDatos)
  res.status(200).json({humedad: currentDatos.humedad, temperatura: currentDatos.temperatura})
});


// Endpoint para actualizar el comando
app.post('/setCommand', (req, res) => {
    const command = req.body.command;
    console.log(command)
    if (command === "START" || command === "STOP") {
      currentCommand = command;
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
    res.send(currentCommand)
})

app.get('/getProgramacionRiegoIT', (req, res) => {
  res.send(currentProgramacionRiego)
})

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
  console.log(`Datos set to ${humedad}, ${startTime}`)
  currentProgramacionRiego = {
    humedad,
    startTime,
  };
  res.status(200).json({humedad: humedad, startTime: startTime});

  clients.forEach(client => client.res.write(`data: ${JSON.stringify(currentProgramacionRiego)}\n\n`));
});

app.listen(PORT, () => {
    console.log(`app is running on port ${PORT}`)
    }
)

