import { test, expect } from "@playwright/test"

const EMAIL = "seed@popularroadways.com"
const PASSWORD = "Seed123!"

const companies = [
  { name: "Shreeji Transport", gst: "27AABCD1234E1Z5", contact: "Ramesh Patel", email: "ramesh@shreeji.com", number: "9876543210" },
  { name: "Mahakali Logistics", gst: "27AABCD5678F1Z6", contact: "Suresh Gupta", email: "suresh@mahakali.com", number: "9876543211" },
  { name: "Om Freight Solutions", gst: "27AABCD9012G1Z7", contact: "Amit Shah", email: "amit@omfreight.com", number: "9876543212" },
]

const billsData: Record<string, Array<{ billNumber: string; invoiceNumber: string; loadingDate: string; trucks: string; goods: string; amount: string; status: string }>> = {
  "Shreeji Transport": [
    { billNumber: "BILL-001", invoiceNumber: "INV-1001", loadingDate: "2026-06-01", trucks: "4", goods: "Cement", amount: "125000", status: "Partial Paid" },
    { billNumber: "BILL-002", invoiceNumber: "INV-1002", loadingDate: "2026-06-10", trucks: "3", goods: "Steel", amount: "98000", status: "Not Paid" },
    { billNumber: "BILL-003", invoiceNumber: "INV-1003", loadingDate: "2026-06-15", trucks: "6", goods: "Bricks", amount: "210000", status: "Paid" },
  ],
  "Mahakali Logistics": [
    { billNumber: "BILL-001", invoiceNumber: "INV-2001", loadingDate: "2026-06-05", trucks: "5", goods: "Fertilizer", amount: "156000", status: "Not Paid" },
    { billNumber: "BILL-002", invoiceNumber: "INV-2002", loadingDate: "2026-06-12", trucks: "2", goods: "Rice", amount: "45000", status: "Paid" },
  ],
  "Om Freight Solutions": [
    { billNumber: "BILL-001", invoiceNumber: "INV-3001", loadingDate: "2026-06-08", trucks: "8", goods: "Coal", amount: "320000", status: "Partial Paid" },
    { billNumber: "BILL-002", invoiceNumber: "INV-3002", loadingDate: "2026-06-18", trucks: "3", goods: "Timber", amount: "88000", status: "Not Paid" },
    { billNumber: "BILL-003", invoiceNumber: "INV-3003", loadingDate: "2026-06-22", trucks: "4", goods: "Marble", amount: "175000", status: "Not Paid" },
  ],
}

const paymentsData: Record<string, Array<Array<{ mode: string; date: string; account: string; amount: string }>>> = {
  "Shreeji Transport": [
    [{ mode: "Bank Transfer", date: "2026-06-10", account: "HDFC Current", amount: "50000" }],
    [],
    [{ mode: "Cash", date: "2026-06-20", account: "Cash", amount: "210000" }],
  ],
  "Mahakali Logistics": [
    [],
    [{ mode: "Cheque", date: "2026-06-18", account: "SBI Current", amount: "45000" }],
  ],
  "Om Freight Solutions": [
    [{ mode: "Bank Transfer", date: "2026-06-15", account: "ICICI Current", amount: "150000" }],
    [],
    [],
  ],
}

const quotations = [
  { from: "Mumbai", to: "Delhi", truckFreight: "85000", truckCategory: "12-wheeler", detention: "2500", slotBooking: "500", loadingCharges: "3000", unloadingCharges: "3000", cwcParking: "1000" },
  { from: "Ahmedabad", to: "Kolkata", truckFreight: "120000", truckCategory: "16-wheeler", detention: "3500", slotBooking: "800", loadingCharges: "4000", unloadingCharges: "4000", cwcParking: "1500" },
  { from: "Surat", to: "Chennai", truckFreight: "95000", truckCategory: "14-wheeler", detention: "3000", slotBooking: "600", loadingCharges: "3500", unloadingCharges: "3500", cwcParking: "1200" },
]

test.describe("Seed database with sample data", () => {
  test("sign in and populate companies, bills, payments, quotations", async ({ page }) => {
    test.setTimeout(180000)

    // Mobile viewport so company cards (which are links) are visible
    await page.setViewportSize({ width: 390, height: 844 })
    // 1. Sign in
    await page.goto("/")
    await page.fill('input[placeholder="Email address"]', EMAIL)
    await page.fill('input[placeholder="Password"]', PASSWORD)
    await page.click('button[type="submit"]:has-text("Sign in")')

    // Wait for dashboard to load
    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await page.waitForTimeout(2000)

    // 2. Navigate to Companies and add each one
    for (const company of companies) {
      await page.goto("/companies")
      await page.waitForTimeout(1000)

      // Click Add company
      await page.click('button:has-text("Add company")')
      await page.waitForTimeout(500)

      // Fill form
      await page.fill('input[placeholder="Enter company name"]', company.name)
      await page.fill('input[placeholder="GST number"]', company.gst)
      await page.fill('input[placeholder="Contact person"]', company.contact)
      await page.fill('input[placeholder="Email address"]', company.email)
      await page.fill('input[placeholder="Phone number"]', company.number)

      // Save
      await page.click('button[type="submit"]:has-text("Save")')
      await page.waitForTimeout(1500)

      // Verify company appears in table
      await expect(page.locator(`text="${company.name}"`).first()).toBeVisible()
      console.log(`✓ Added company: ${company.name}`)
    }

    // 3. Add bills and payments for each company
    for (const company of companies) {
      await page.goto("/companies")
      await page.waitForTimeout(1000)

      // Click on company row to expand
      await page.locator(`text="${company.name}"`).first().click()
      await page.waitForTimeout(1500)

      const bills = billsData[company.name]
      const payments = paymentsData[company.name]

      for (let i = 0; i < bills.length; i++) {
        const bill = bills[i]

        // Add bill
        await page.click('button:has-text("Add Bill")')
        await page.waitForTimeout(500)

        await page.fill('input[placeholder="Bill number"]', bill.billNumber)
        await page.fill('input[placeholder="Invoice number"]', bill.invoiceNumber)
        // Loading date
        const dateInput = page.locator('input[type="date"]').first()
        await dateInput.fill(bill.loadingDate)
        await page.fill('input[placeholder="Number of trucks"]', bill.trucks)
        await page.fill('input[placeholder="Type of goods"]', bill.goods)
        await page.fill('input[placeholder="Amount"]', bill.amount)
        await page.selectOption('select', bill.status)

        await page.click('button[type="submit"]:has-text("Save")')
        await page.waitForTimeout(1500)
        console.log(`  ✓ Added bill ${bill.billNumber} for ${company.name}`)

        // Add payments for this bill (if any)
        const billPayments = payments[i]
        if (billPayments && billPayments.length > 0) {
          for (const payment of billPayments) {
            await page.click('text=+ Add Payment')
            await page.waitForTimeout(500)

            await page.fill('input[placeholder="Cash, Bank Transfer, etc."]', payment.mode)
            const paymentDateInput = page.locator('input[type="date"]').first()
            await paymentDateInput.fill(payment.date)
            await page.fill('input[placeholder="Bank account name"]', payment.account)
            await page.fill('input[placeholder="0"]', payment.amount)

            await page.click('button[type="submit"]:has-text("Save")')
            await page.waitForTimeout(1500)
            console.log(`    ✓ Added payment ₹${payment.amount} for bill ${bill.billNumber}`)
          }
        }
      }
    }

    // 4. Add quotations
    await page.goto("/quotation")
    await page.waitForTimeout(1000)

    for (const q of quotations) {
      await page.fill('input[placeholder="Origin"]', q.from)
      await page.fill('input[placeholder="Destination"]', q.to)
      await page.fill('input[placeholder="0"]', q.truckFreight)
      await page.fill('input[placeholder="e.g. 12-wheeler"]', q.truckCategory)
      await page.fill('input[placeholder="0"]', q.detention)
      await page.fill('input[placeholder="Slot booking charge"]', q.slotBooking)
      await page.fill('input[placeholder="0"]', q.loadingCharges)
      await page.fill('input[placeholder="0"]', q.unloadingCharges)
      await page.fill('input[placeholder="0"]', q.cwcParking)

      await page.click('button[type="submit"]:has-text("Save quotation")')
      await page.waitForTimeout(1500)
      console.log(`✓ Added quotation: ${q.from} → ${q.to}`)
    }

    // 5. Verify dashboard shows correct stats
    await page.goto("/dashboard")
    await page.waitForTimeout(2000)
    console.log("✅ Seeding complete! Dashboard should show populated stats.")

    // Final confirmation - check dashboard h1
    await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible()
  })
})
