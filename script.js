import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://xntdxtuinufkksopjytc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhudGR4dHVpbnVma2tzb3BqeXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzY5NzksImV4cCI6MjA2ODc1Mjk3OX0.p0uw875QyOhwrORXz0tecqJIU3pH6Um2cH9zAzk62-o';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Get URL parameter
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Load round options into select
async function loadRounds() {
  const roundSelect = document.getElementById('round');
  if (!roundSelect) return;

  const { data: rounds, error } = await supabase.from('rounds').select('id, round_name');

  if (error) {
    console.error('Error loading rounds:', error);
    return;
  }

  roundSelect.innerHTML = `<option value="">Select Round</option>`;

  rounds.forEach(round => {
    const option = document.createElement('option');
    option.value = round.id;
    option.textContent = round.round_name;
    roundSelect.appendChild(option);
  });
}

// Add customer to DB
async function addCustomer() {
  const name = document.getElementById('name').value.trim();
  const address = document.getElementById('address').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const balance = parseFloat(document.getElementById('balance').value) || 0;
  const round = document.getElementById('round').value;

  const { error } = await supabase.from('customers').insert([
    {
      customer_name: name,
      address: address,
      phone_number: phone,
      notes: notes,
      balance: balance,
      round_id: round || null
    }
  ]);

  const status = document.getElementById('status');
  if (error) {
    console.error("Insert error details:", JSON.stringify(error, null, 2));
    status.innerText = 'Failed to save customer.';
    status.className = 'text-red-500 text-sm';
  } else {
    status.innerText = 'Customer saved successfully!';
    status.className = 'text-green-600 text-sm';
    loadCustomers();

    // Clear form
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('balance').value = '';
    document.getElementById('round').value = '';
    document.getElementById('notes').value = '';
  }
}

// Load customers + round names + optional filter
async function loadCustomers() {
  const table = document.getElementById('customer-table');
  const filterInfo = document.getElementById('filterInfo');
  if (!table) return;

  const roundId = getQueryParam('roundId');
  const roundName = getQueryParam('roundName');

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      rounds (
        round_name
      )
    `)
    .order('created_at', { ascending: false });

  table.innerHTML = '';

  if (error) {
    table.innerText = 'Error loading customers.';
    console.error('Load error:', error);
    return;
  }

  let filteredData = data;
  if (roundId) {
    filteredData = data.filter(c => c.round_id === roundId);
  }

  if (roundId && filterInfo) {
    filterInfo.innerHTML = `
      <p>
        Showing customers in: <strong>${roundName}</strong>
        <button onclick="window.location.href='customers.html'" class="ml-2 underline text-blue-600">
          Clear filter
        </button>
      </p>
    `;
  } else if (filterInfo) {
    filterInfo.innerHTML = '';
  }

  filteredData.forEach(customer => {
    const item = document.createElement('div');
    item.className = 'p-3 rounded bg-gray-100';
    item.innerHTML = `
      <strong>${customer.customer_name}</strong><br>
      ${customer.address}<br>
      📞 ${customer.phone_number}<br>
      📍 ${customer.rounds?.round_name || 'No round'}<br>
      💬 ${customer.notes} | 💰 £${(customer.balance ?? 0).toFixed(2)}
    `;
    table.appendChild(item);
  });
}

// Run on page load
window.addEventListener('DOMContentLoaded', () => {
  loadRounds();
  loadCustomers();
});

window.addCustomer = addCustomer;

window.addEventListener('DOMContentLoaded', () => {
  loadRounds(); // ✅ THIS is what was missing!
});
