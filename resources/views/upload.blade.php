<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Upload MIS Data - MIS Reporting Automation</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-gray-50 text-gray-800 font-sans antialiased">
    <div class="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl mx-auto">
            <div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                <div class="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
                    <h1 class="text-2xl font-bold">Daily MIS Reporting System</h1>
                    <p class="text-blue-100 mt-1">Upload the daily CSV reports and enter operational metrics.</p>
                </div>

                <div class="p-8">
                    <form id="misUploadForm" class="space-y-8" enctype="multipart/form-data">
                        <div id="alertBox" class="hidden rounded-md p-4 mb-4"></div>

                        <!-- Date Selection -->
                        <div>
                            <label for="date" class="block text-sm font-semibold text-gray-700">Report Date <span class="text-red-500">*</span></label>
                            <input type="date" name="date" id="date" required
                                class="mt-2 block w-full sm:w-1/3 rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-4 py-2" />
                        </div>

                        <hr class="border-gray-200">

                        <!-- File Uploads -->
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">1. Upload CSV Reports</h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                                    <label for="bill_file" class="block text-sm font-semibold text-gray-700 mb-2">Bill Item Wise Detail <span class="text-red-500">*</span></label>
                                    <input type="file" name="bill_file" id="bill_file" accept=".csv" required class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                </div>

                                <div class="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                                    <label for="collection_file" class="block text-sm font-semibold text-gray-700 mb-2">Cashier Collection <span class="text-red-500">*</span></label>
                                    <input type="file" name="collection_file" id="collection_file" accept=".csv" required class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                                </div>

                                <div class="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                                    <label for="package_file" class="block text-sm font-semibold text-gray-700 mb-2">Package Consumption <span class="text-red-500">*</span></label>
                                    <input type="file" name="package_file" id="package_file" accept=".csv" required class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                                </div>
                            </div>
                        </div>

                        <hr class="border-gray-200">

                        <!-- Manual Inputs -->
                        <div>
                            <h3 class="text-lg font-medium text-gray-900 mb-4">2. Manual Operational Metrics</h3>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label for="occupancy" class="block text-sm font-semibold text-gray-700">Occupancy</label>
                                    <input type="number" name="occupancy" id="occupancy" min="0" class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-4 py-2" placeholder="e.g. 150">
                                </div>
                                <div>
                                    <label for="occupancy_percent" class="block text-sm font-semibold text-gray-700">Occupancy %</label>
                                    <input type="number" step="0.01" name="occupancy_percent" id="occupancy_percent" min="0" max="100" class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-4 py-2" placeholder="e.g. 85.5">
                                </div>
                                <div>
                                    <label for="admission" class="block text-sm font-semibold text-gray-700">Admission</label>
                                    <input type="number" name="admission" id="admission" min="0" class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-4 py-2" placeholder="e.g. 20">
                                </div>
                                <div>
                                    <label for="discharge" class="block text-sm font-semibold text-gray-700">Discharge</label>
                                    <input type="number" name="discharge" id="discharge" min="0" class="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border px-4 py-2" placeholder="e.g. 18">
                                </div>
                            </div>
                        </div>

                        <div class="pt-6 flex items-center justify-end border-t border-gray-200">
                            <button type="submit" id="submitBtn" class="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 py-3 px-6 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all">
                                <span>Upload and Process</span>
                                <svg id="spinner" class="hidden animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('date').valueAsDate = new Date();

        document.getElementById('misUploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const form = e.target;
            const submitBtn = document.getElementById('submitBtn');
            const spinner = document.getElementById('spinner');
            const alertBox = document.getElementById('alertBox');
            
            // UI state: loading
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
            spinner.classList.remove('hidden');
            alertBox.classList.add('hidden');
            
            const formData = new FormData(form);
            
            try {
                const response = await fetch('/api/mis/upload', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json'
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                alertBox.classList.remove('hidden', 'bg-red-50', 'text-red-800');
                
                if (response.ok) {
                    alertBox.classList.add('bg-green-50', 'text-green-800');
                    alertBox.innerHTML = `
                        <div class="flex">
                            <svg class="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                            <strong>Success!</strong> &nbsp;${result.message}
                        </div>
                    `;
                    form.reset();
                    document.getElementById('date').valueAsDate = new Date();
                } else {
                    throw new Error(result.message || 'Validation or Server Error');
                }
            } catch (error) {
                alertBox.classList.remove('hidden', 'bg-green-50', 'text-green-800');
                alertBox.classList.add('bg-red-50', 'text-red-800');
                alertBox.innerHTML = `
                    <div class="flex">
                        <svg class="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
                        <strong>Error!</strong> &nbsp;${error.message}
                    </div>
                `;
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                spinner.classList.add('hidden');
            }
        });
    </script>
</body>
</html>
