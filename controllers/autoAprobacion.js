const db = require("../models/db"); // Ajusta la ruta según tu estructura
const cron = require('node-cron'); // Asegúrate de instalarlo: npm install node-cron

// Ejecutar cada 10 minutos
cron.schedule('*/10 * * * *', () => {
  const query = `
   UPDATE tickets
SET 
  aprobacion_solucion = 'si',
  solucion_observacion = 'aprobado por sistema'
WHERE
  (aprobacion_solucion IS NULL OR aprobacion_solucion != 'si')
  AND fecha_cierre IS NOT NULL
  AND TIMESTAMPDIFF(MINUTE, fecha_cierre, NOW()) > 30;
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar tickets automáticamente:', err);
    } else {
      console.log(`✅ Tickets actualizados automáticamente: ${result.affectedRows}`);
    }
  });
});
