# Lease Drafting System - Client Overview

## 🎯 What This App Does

The **Automated Lease Drafting System** is a professional web application that streamlines the entire lease agreement creation process. It automatically extracts data from FICA documents, populates lease forms, and generates professional PDF lease agreements in minutes instead of hours.

---

## ✨ Key Features

### 1. **Document Upload & Processing**
- Upload multiple CIPC documents (Landlord & Tenant)
- Upload ID documents (Tenant & Surety)
- Automatic data extraction from uploaded documents
- Support for PDF, images, and text files

### 2. **Smart Data Extraction**
- Paste FICA document text → Automatically extracts:
  - Company name, registration numbers, VAT numbers
  - Physical and postal addresses
  - Bank account details (name, account number, branch code)
  - Trading names and other relevant information

### 3. **Comprehensive Form Management**
- **Landlord Information**: Name, phone, registration, VAT, banking details
- **Tenant Information**: All company details, addresses, bank accounts
- **Surety Details**: Name, ID number, address
- **Premises Information**: Unit, building name, address, measurements, permitted use
- **Lease Terms**: Duration, commencement/termination dates, option periods
- **Financial Details**: Rent, security deposits, rates, refuse, utilities (Year 1, 2, 3)

### 4. **Time-Saving Features**
- **Default Landlord & Surety**: Save frequently used information for instant auto-fill
- **Draft Saving**: Save work-in-progress leases and resume later
- **History Tracking**: View and re-download previously generated leases
- **Auto-calculation**: Automatic rent escalation (6% per year) and VAT calculations

### 5. **Professional PDF Generation**
- Generates professionally formatted lease agreement PDFs
- Includes all required sections (Part A format)
- Properly aligned tables and spacing
- Ready for printing and signing

### 6. **Document Management**
- All uploaded documents are stored with each lease
- Download lease PDFs and attached documents anytime
- Track complete lease packages with full audit trail

---

## 📋 How to Use the App

### **Step 1: Upload Documents**
1. Click "Choose File" under each document type:
   - Landlord CIPC Document
   - Tenant CIPC Document  
   - Tenant ID Document
   - Surety ID Document
2. You can upload multiple files for each type
3. Documents are automatically processed

### **Step 2: Extract Data from FICA**
1. Copy and paste FICA document text into the text area
2. Click **"Extract Data from Pasted Text"**
3. Tenant information automatically populates in the form

### **Step 3: Fill in Form Fields**
1. **Landlord Section**: Enter landlord details (or use saved default)
2. **Tenant Section**: Review and edit auto-extracted data
3. **Surety Section**: Enter surety information (or use saved default)
4. **Premises Section**: Enter property details
5. **Lease Terms**: Set lease duration and dates
6. **Financial Details**: Enter rent, deposits, and charges
   - Toggle Year 2 and Year 3 on/off as needed

### **Step 4: Set Defaults (Optional)**
- Fill in landlord or surety information
- Check **"Save as Default"** checkbox
- Future leases will auto-populate with this information

### **Step 5: Preview & Generate**
1. Click **"Preview"** to see PDF before generating
2. Review all information
3. Click **"Generate PDF"** to create final lease agreement
4. PDF downloads automatically
5. Form clears automatically for next lease

### **Step 6: Access Saved Leases**
- Click **"Saved Leases"** button to view all generated leases
- Download PDF or attached documents anytime
- Delete old leases as needed

---

## 💡 Pro Tips

1. **Save Drafts**: Use "Save Draft" button to save work-in-progress
2. **Use Defaults**: Set default landlord/surety for faster processing
3. **Multiple Documents**: Upload all pages of multi-page documents
4. **History**: Use "History" button to quickly re-download PDFs
5. **Clear Form**: Use "Clear All Fields" to start fresh

---

## 🔒 Data Security

- All data is stored locally in your browser
- No data is sent to external servers (except PDF generation)
- Documents are encrypted in browser storage
- Full audit trail of all actions

---

## 📞 Support

If you encounter any issues:
1. Check that all required fields are filled
2. Ensure backend server is running (for PDF generation)
3. Verify document formats are supported (PDF, JPG, PNG, TXT)
4. Check browser console for error messages

---

## 🚀 Getting Started

1. **Start the Application**:
   - Frontend: `npm start` (runs on http://localhost:3000)
   - Backend: `cd server && npm start` (runs on http://localhost:5000)

2. **First Use**:
   - Upload a test document
   - Paste sample FICA text
   - Generate your first lease

3. **Production Use**:
   - Set default landlord information
   - Upload all required documents
   - Generate professional lease agreements

---

**The app is ready to use and will significantly speed up your lease drafting process!**


