const { query } = require('../config/database');

/**
 * Servicio de WhatsApp con Twilio
 */

const sendWhatsApp = async ({ phone, booking_id, payment_id, type, data }) => {
  try {
    console.log('📱 Intentando enviar WhatsApp...');
    console.log('Tipo:', type);
    console.log('Teléfono:', phone);
    
    // Validar número de teléfono
    if (!phone) {
      console.log('❌ No hay número de teléfono');
      return false;
    }

    // Generar mensaje según tipo
    const message = generateMessage(type, data);
    console.log('Mensaje generado:', message);

    // Enviar mensaje
    const sent = await sendMessageToAPI(phone, message);

    // Registrar en log
    await query(
      `INSERT INTO whatsapp_logs (booking_id, payment_id, customer_phone, 
       message_type, message_content, sent_successfully, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [booking_id || null, payment_id || null, phone, type, message, sent]
    );

    // Actualizar flag en payment si aplica
    if (payment_id && sent) {
      await query(
        'UPDATE payments SET whatsapp_sent = TRUE, whatsapp_sent_at = NOW() WHERE id = ?',
        [payment_id]
      );
    }

    return sent;
  } catch (error) {
    console.error('❌ Error al enviar WhatsApp:', error);
    
    // Registrar error en log
    try {
      await query(
        `INSERT INTO whatsapp_logs (booking_id, payment_id, customer_phone, 
         message_type, message_content, sent_successfully, error_message)
         VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
        [booking_id || null, payment_id || null, phone, type, '', error.message]
      );
    } catch (logError) {
      console.error('Error al registrar log:', logError);
    }

    return false;
  }
};

/**
 * Generar contenido del mensaje según tipo
 */
const generateMessage = (type, data) => {
  const messages = {
    payment_confirmation: `
🏨 *Confirmación de Pago*

Hola ${data.name},

✅ Pago registrado exitosamente

📋 *Detalles:*
• Código: ${data.booking_code}
• Habitación: ${data.room_number}
• Monto pagado: Bs. ${parseFloat(data.amount_paid).toFixed(2)}
• Total: Bs. ${parseFloat(data.total_amount).toFixed(2)}
• Saldo: Bs. ${parseFloat(data.balance).toFixed(2)}

¡Gracias por su preferencia!
    `.trim(),

    checkout: `
🏨 *Check-out Completado*

Hola ${data.name},

✅ Check-out procesado exitosamente

📋 *Detalles:*
• Código: ${data.booking_code}
• Habitación: ${data.room_number}
• Check-in: ${new Date(data.check_in).toLocaleDateString('es-BO')}
• Check-out: ${new Date(data.check_out).toLocaleDateString('es-BO')}
• Total: Bs. ${parseFloat(data.total_amount).toFixed(2)}

¡Esperamos verle pronto! 🌟
    `.trim(),

    admin_notification: `
💰 *NUEVO COBRO REGISTRADO*

Cliente: ${data.customer_name}
Habitación: ${data.room_number}

📊 *RESUMEN DEL COBRO:*
• Total cobrado: Bs. ${parseFloat(data.total_amount).toFixed(2)}
• Método de pago: ${data.payment_method}
• Hora: ${new Date().toLocaleTimeString('es-BO')}

👤 *DATOS DEL CLIENTE:*
• Nombre: ${data.customer_name}
• Documento: ${data.document_number}
• Edad: ${data.age || 'N/A'} años
• Nacionalidad: ${data.nationality || 'N/A'}
• Procedencia: ${data.origin || 'N/A'}

📅 *ESTADÍA:*
• Check-in: ${new Date(data.check_in).toLocaleString('es-BO')}
• Check-out: ${new Date(data.check_out).toLocaleString('es-BO')}

${data.charges_detail ? `📦 *CARGOS EXTRAS:*\n${data.charges_detail}` : ''}

✅ Sistema de Gestión Hotelera
    `.trim(),

    charge_added: `
🏨 *Cargo Adicional Registrado*

Hola ${data.name},

Se ha añadido un cargo a su cuenta:

📋 *Detalles:*
• Reserva: ${data.booking_code}
• Cargo: Bs. ${parseFloat(data.charge_amount).toFixed(2)}
• Nuevo total: Bs. ${parseFloat(data.total_amount).toFixed(2)}

Cualquier consulta, estamos a su disposición.
    `.trim(),

    reminder: `
🏨 *Recordatorio de Pago*

Hola ${data.name},

Le recordamos que tiene un saldo pendiente:

📋 *Detalles:*
• Reserva: ${data.booking_code}
• Saldo: Bs. ${parseFloat(data.balance).toFixed(2)}

Por favor, acérquese a recepción.

¡Gracias!
    `.trim()
  };

  return messages[type] || 'Mensaje de notificación';
};

/**
 * Enviar mensaje vía Twilio
 */
const sendMessageToAPI = async (phone, message) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM;

    console.log('🔧 Configuración Twilio:');
    console.log('Account SID:', accountSid ? 'Configurado ✅' : 'NO configurado ❌');
    console.log('Auth Token:', authToken ? 'Configurado ✅' : 'NO configurado ❌');
    console.log('WhatsApp From:', twilioWhatsAppFrom ? twilioWhatsAppFrom : 'NO configurado ❌');

    // Validar configuración
    if (!accountSid || !authToken || !twilioWhatsAppFrom) {
      console.error('❌ Configuración de Twilio incompleta en .env');
      return false;
    }

    // Formatear número de teléfono para WhatsApp
    let formattedPhone = phone;
    if (!phone.startsWith('whatsapp:')) {
      formattedPhone = `whatsapp:${phone}`;
    }

    console.log('📞 Enviando a:', formattedPhone);

    // Enviar mensaje con Twilio
    const client = require('twilio')(accountSid, authToken);
    
    const result = await client.messages.create({
      body: message,
      from: twilioWhatsAppFrom,
      to: formattedPhone
    });

    console.log('✅ WhatsApp enviado exitosamente via Twilio');
    console.log('SID del mensaje:', result.sid);
    console.log('Estado:', result.status);

    return true;
    
  } catch (error) {
    console.error('❌ Error en Twilio:', error.message);
    console.error('Código de error:', error.code);
    console.error('Detalles:', error.moreInfo);
    return false;
  }
};

/**
 * Enviar notificación al administrador
 */
const sendAdminNotification = async (bookingData) => {
  try {
    const adminPhone = process.env.ADMIN_WHATSAPP;
    
    console.log('📱 Enviando notificación al admin...');
    console.log('Admin Phone:', adminPhone);

    if (!adminPhone) {
      console.error('❌ ADMIN_WHATSAPP no configurado en .env');
      return false;
    }

    // Preparar datos para el mensaje
    const data = {
      customer_name: bookingData.customer_name,
      room_number: bookingData.room_number,
      total_amount: bookingData.total_amount,
      payment_method: bookingData.payment_method || 'Efectivo',
      document_number: bookingData.document_number,
      age: bookingData.age,
      nationality: bookingData.nationality,
      origin: bookingData.origin,
      check_in: bookingData.check_in,
      check_out: bookingData.check_out || new Date(),
      charges_detail: bookingData.charges_detail || ''
    };

    const sent = await sendWhatsApp({
      phone: adminPhone,
      booking_id: bookingData.booking_id,
      type: 'admin_notification',
      data: data
    });

    if (sent) {
      console.log('✅ Notificación enviada al administrador');
    } else {
      console.error('❌ No se pudo enviar notificación al administrador');
    }

    return sent;
  } catch (error) {
    console.error('❌ Error al enviar notificación al admin:', error);
    return false;
  }
};

module.exports = {
  sendWhatsApp,
  sendAdminNotification
};