import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typeLabels = {
  donation: 'DONATION RECEIPT',
  membership: 'MEMBERSHIP PAYMENT RECEIPT',
  tournament: 'TOURNAMENT ENTRY RECEIPT',
  coach_listing: 'COACH LISTING PAYMENT RECEIPT'
};

const typeDescriptions = {
  donation: 'Thank you for your generous donation!',
  membership: 'Thank you for becoming a ZTA member!',
  tournament: 'Thank you for registering for the tournament!',
  coach_listing: 'Thank you for listing with ZTA!'
};

/**
 * Generate a PDF receipt for any transaction
 * @param {Object} transaction - The transaction object
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateReceipt = (transaction) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const logoPath = path.join(__dirname, '../assets/zta-logo.png');

      // Header with logo
      try {
        doc.image(logoPath, 50, 45, { width: 100 });
      } catch (e) {
        console.log('Logo not found, proceeding without it');
      }

      // Organization info (right side of header)
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text('Zambia Tennis Association', 350, 50, { align: 'right' })
        .text('Olympic Youth Development Centre', 350, 65, { align: 'right' })
        .text('Independence Stadium, Lusaka', 350, 80, { align: 'right' })
        .text('info@zambiatennis.com', 350, 95, { align: 'right' })
        .text('+260 979 326 778', 350, 110, { align: 'right' });

      // Line separator
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(50, 140)
        .lineTo(545, 140)
        .stroke();

      // Receipt title
      const receiptTitle = typeLabels[transaction.type] || 'PAYMENT RECEIPT';
      doc
        .fontSize(24)
        .fillColor('#1F2937')
        .text(receiptTitle, 50, 170, { align: 'center' });

      // Receipt number and date
      doc
        .fontSize(12)
        .fillColor('#6B7280')
        .text(`Receipt No: ${transaction.receiptNumber}`, 50, 210, { align: 'center' })
        .text(`Date: ${new Date(transaction.paymentDate || transaction.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`, 50, 228, { align: 'center' });

      // Thank you message
      const thankYouMessage = typeDescriptions[transaction.type] || 'Thank you for your payment!';
      doc
        .fontSize(14)
        .fillColor('#059669')
        .text(thankYouMessage, 50, 270, { align: 'center' });

      // Payment details box
      const boxTop = 310;
      doc
        .roundedRect(50, boxTop, 495, 200, 8)
        .fillColor('#F9FAFB')
        .fill();

      // Payment details content
      const detailsLeft = 70;
      const valuesLeft = 250;
      let currentY = boxTop + 25;

      // Payer Name
      doc
        .fontSize(11)
        .fillColor('#6B7280')
        .text('Payer Name:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(transaction.payerName, valuesLeft, currentY);

      // Email
      currentY += 28;
      doc
        .fillColor('#6B7280')
        .text('Email:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(transaction.payerEmail, valuesLeft, currentY);

      // Description
      currentY += 28;
      doc
        .fillColor('#6B7280')
        .text('Description:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(transaction.description || formatType(transaction.type), valuesLeft, currentY);

      // Payment Reference
      currentY += 28;
      doc
        .fillColor('#6B7280')
        .text('Payment Reference:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(transaction.reference || 'N/A', valuesLeft, currentY);

      // Transaction ID
      currentY += 28;
      doc
        .fillColor('#6B7280')
        .text('Transaction ID:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(transaction.transactionId || 'N/A', valuesLeft, currentY);

      // Payment Method
      currentY += 28;
      doc
        .fillColor('#6B7280')
        .text('Payment Method:', detailsLeft, currentY)
        .fillColor('#1F2937')
        .text(formatPaymentMethod(transaction.paymentMethod), valuesLeft, currentY);

      // Amount box — spans full width of the payment details box
      currentY = boxTop + 160;
      const amountBoxLeft = 50;
      const amountBoxWidth = 495;
      doc
        .roundedRect(amountBoxLeft, currentY, amountBoxWidth, 35, 4)
        .fillColor('#059669')
        .fill();

      doc
        .fontSize(14)
        .fillColor('#FFFFFF')
        .text('Amount Paid:', amountBoxLeft + 20, currentY + 10)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`K${parseFloat(transaction.amount).toFixed(2)}`, amountBoxLeft, currentY + 9, {
          width: amountBoxWidth - 20,
          align: 'right'
        });

      // Reset font
      doc.font('Helvetica');

      // Type-specific details
      let detailsY = 530;
      if (transaction.metadata) {
        const metadata = transaction.metadata;

        if (transaction.type === 'donation' && metadata.donationType) {
          doc
            .fontSize(11)
            .fillColor('#6B7280')
            .text('Donation Purpose:', 50, detailsY)
            .fillColor('#1F2937')
            .text(formatDonationType(metadata.donationType), 180, detailsY);
        }

        if (transaction.type === 'membership' && metadata.membershipType) {
          doc
            .fontSize(11)
            .fillColor('#6B7280')
            .text('Membership Type:', 50, detailsY)
            .fillColor('#1F2937')
            .text(metadata.membershipType.charAt(0).toUpperCase() + metadata.membershipType.slice(1), 180, detailsY);

          if (metadata.membershipExpiry) {
            detailsY += 20;
            doc
              .fillColor('#6B7280')
              .text('Valid Until:', 50, detailsY)
              .fillColor('#1F2937')
              .text(new Date(metadata.membershipExpiry).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }), 180, detailsY);
          }
        }

        if (transaction.type === 'membership' && metadata.players && metadata.players.length > 0) {
          detailsY += 25;
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#1F2937')
            .text(`Players (${metadata.players.length}):`, 50, detailsY);
          doc.font('Helvetica');

          for (const player of metadata.players) {
            detailsY += 18;
            doc
              .fontSize(10)
              .fillColor('#1F2937')
              .text(`•  ${player.name}`, 60, detailsY, { continued: !!player.zpin })
            if (player.zpin) {
              doc
                .fillColor('#6B7280')
                .text(`  (ZPIN: ${player.zpin})`, { continued: false });
            }
          }
        }

        if (transaction.type === 'tournament' && metadata.tournamentName) {
          doc
            .fontSize(11)
            .fillColor('#6B7280')
            .text('Tournament:', 50, detailsY)
            .fillColor('#1F2937')
            .text(metadata.tournamentName, 180, detailsY);
        }
      }

      // Footer
      const footerY = Math.max(680, detailsY + 40);
      doc
        .strokeColor('#E5E7EB')
        .lineWidth(1)
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .stroke();

      doc
        .fontSize(10)
        .fillColor('#6B7280')
        .text(
          'This receipt confirms your payment to the Zambia Tennis Association.',
          50, footerY + 15,
          { align: 'center' }
        )
        .text(
          'Your support helps us promote and develop tennis in Zambia.',
          50, footerY + 30,
          { align: 'center' }
        )
        .fontSize(9)
        .text(
          'For any queries, please contact us at info@zambiatennis.com',
          50, footerY + 55,
          { align: 'center' }
        );

      // Official stamp area
      doc
        .fontSize(10)
        .fillColor('#9CA3AF')
        .text('Electronically Generated Receipt', 50, footerY + 80, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Format payment type for display
 */
function formatType(type) {
  const types = {
    donation: 'Donation',
    membership: 'Membership Payment',
    tournament: 'Tournament Entry Fee',
    coach_listing: 'Coach Listing Fee'
  };
  return types[type] || type?.replace(/_/g, ' ') || 'Payment';
}

/**
 * Format donation type for display
 */
function formatDonationType(type) {
  const types = {
    general: 'General Support',
    youth_development: 'Youth Development',
    tournament_support: 'Tournament Support',
    coach_education: 'Coach Education',
    infrastructure: 'Infrastructure'
  };
  return types[type] || type?.replace(/_/g, ' ') || 'General';
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method) {
  const methods = {
    card: 'Card Payment',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    other: 'Online Payment'
  };
  return methods[method] || 'Online Payment';
}

// Keep backward compatibility
export const generateDonationReceipt = generateReceipt;

export default generateReceipt;
