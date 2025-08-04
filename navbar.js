const navbarHTML = `
  <nav class="bg-white shadow p-4 flex items-center justify-between">
    <div class="text-lg font-bold text-pink-600">🧼 My Cleaning App</div>
    <div class="space-x-4 text-blue-700 text-sm">
      <a href="index.html" class="hover:underline">Add Customer</a>
      <a href="customers.html" class="hover:underline">Customer Database</a>
      <a href="rounds_database.html" class="hover:underline">Rounds</a>
    </div>
  </nav>
`;

document.body.insertAdjacentHTML("afterbegin", navbarHTML);