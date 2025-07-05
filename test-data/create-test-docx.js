// Simple script to create a test DOCX file
const fs = require('fs');
const path = require('path');

// Basic DOCX structure (minimal Office Open XML)
const docxContent = `PK\x03\x04\x14\x00\x00\x00\x08\x00`;

// For now, let's create a simple text file with .docx extension
// that our mammoth library can attempt to process
const textContent = `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the date last signed below between:

Party A: Example Corporation
Address: 789 Business Park, Seattle, WA 98101

Party B: Sample Industries Ltd.
Address: 321 Commerce Street, Portland, OR 97201

RECITALS

WHEREAS, the parties wish to explore a potential business relationship;
WHEREAS, in connection with such exploration, each party may disclose confidential information to the other;
NOW, THEREFORE, the parties agree as follows:

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any and all information or data that has or could have commercial value or other utility in the business in which the disclosing party is engaged.

2. OBLIGATIONS OF RECEIVING PARTY
The receiving party agrees to hold the Confidential Information in strict confidence and not to disclose such Confidential Information to third parties.

3. TERM
This Agreement shall be effective as of the date first written above and shall continue for three (3) years.

4. MISCELLANEOUS
This Agreement shall be governed by the laws of the State of Washington.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

EXAMPLE CORPORATION                SAMPLE INDUSTRIES LTD.

_______________________           _______________________
Authorized Signature              Authorized Signature`;

// Save as a text file with .docx extension for testing
fs.writeFileSync(
  path.join(__dirname, 'sample-mutual-nda.docx'),
  textContent,
  'utf8'
);

console.log('Created test DOCX file: sample-mutual-nda.docx');