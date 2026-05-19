/* ═══════════════════════════════════════════════
   PlantVision AI — script.js
   OpenRouter AI + Plant.id Integration
════════════════════════════════════════════════ */

// ── API KEYS (replace with your actual keys) ──
const PLANT_ID_API_KEY = "PASTE_PLANT_ID_KEY";
const OPENROUTER_API_KEY = "PASTE_OPENROUTER_KEY";

// ── OPENROUTER CONFIG ──
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "google/gemma-3-27b-it:free";
const FALLBACK_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

// ── PLANT.ID CONFIG ──
const PLANT_ID_ENDPOINT = "https://api.plant.id/v2/identify";

// ── STATE ──
let currentFile = null;
let currentImageBase64 = null;
let analysisRunning = false;

/* ════════════════════════════════════════
   PARTICLE SYSTEM
════════════════════════════════════════ */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 0.5,
    speedX: (Math.random() - 0.5) * 0.4,
    speedY: (Math.random() - 0.5) * 0.4,
    opacity: Math.random() * 0.5 + 0.1,
    color: `rgba(74, 222, 128, ${Math.random() * 0.4 + 0.1})`
  };
}

function initParticles() {
  particles = [];
  const count = Math.min(80, Math.floor(window.innerWidth / 14));
  for (let i = 0; i < count; i++) particles.push(createParticle());
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, i) => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
    if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Draw connection lines
    particles.slice(i + 1).forEach(p2 => {
      const dx = p.x - p2.x, dy = p.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.06 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
  });
  requestAnimationFrame(drawParticles);
}

resizeCanvas();
initParticles();
drawParticles();
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

/* ════════════════════════════════════════
   FLOATING LEAVES
════════════════════════════════════════ */
const LEAVES = ['🍃', '🌿', '🍀', '☘️', '🌱'];
const leavesContainer = document.getElementById('leavesContainer');

function spawnLeaf() {
  const leaf = document.createElement('div');
  leaf.className = 'leaf';
  leaf.textContent = LEAVES[Math.floor(Math.random() * LEAVES.length)];
  leaf.style.left = Math.random() * 100 + 'vw';
  leaf.style.fontSize = (14 + Math.random() * 16) + 'px';
  const dur = 12 + Math.random() * 16;
  leaf.style.animationDuration = dur + 's';
  leaf.style.animationDelay = Math.random() * -dur + 's';
  leavesContainer.appendChild(leaf);
  setTimeout(() => leaf.remove(), dur * 1000);
}

for (let i = 0; i < 8; i++) spawnLeaf();
setInterval(spawnLeaf, 3000);

/* ════════════════════════════════════════
   TOAST NOTIFICATIONS
════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ════════════════════════════════════════
   NAVBAR
════════════════════════════════════════ */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}

function scrollToDetect() {
  document.getElementById('detect').scrollIntoView({ behavior: 'smooth' });
  closeMobileMenu();
}

/* ════════════════════════════════════════
   FILE UPLOAD / DRAG & DROP
════════════════════════════════════════ */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('uploadZone').classList.add('dragging');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragging');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('uploadZone').classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  // Validate type
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
    showToast('Please upload a JPG, PNG, or WEBP image.', 'error');
    return;
  }
  // Validate size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image must be under 10MB.', 'error');
    return;
  }

  currentFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    currentImageBase64 = dataUrl.split(',')[1];

    // Show preview
    document.getElementById('previewImg').src = dataUrl;
    document.getElementById('uploadIdle').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'block';

    showToast('Image loaded! Click "Analyze Plant" to identify.', 'success');
  };
  reader.onerror = () => showToast('Failed to read image file.', 'error');
  reader.readAsDataURL(file);
}

/* ════════════════════════════════════════
   PROGRESS / STEPS HELPERS
════════════════════════════════════════ */
function setStep(activeStep, progress) {
  const steps = ['step1', 'step2', 'step3', 'step4'];
  const statuses = [
    'Extracting botanical features...',
    'Matching plant species...',
    'Generating plant details...',
    'Generating Hindi explanation...'
  ];

  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active', 'done');
    if (i < activeStep) el.classList.add('done');
    else if (i === activeStep) el.classList.add('active');
  });

  document.getElementById('scannerStatus').textContent = statuses[activeStep] || 'Finalizing...';
  document.getElementById('progressBar').style.width = progress + '%';
}

function showLoading(imgSrc) {
  document.getElementById('scanningImg').src = imgSrc;
  document.getElementById('loadingSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = true;
  setStep(0, 10);
  document.getElementById('loadingSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideLoading() {
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = false;
}

/* ════════════════════════════════════════
   PLANT.ID API CALL
════════════════════════════════════════ */
async function identifyPlant(base64Image) {
  const payload = {
    images: [`data:image/jpeg;base64,${base64Image}`],
    plant_details: [
      "common_names",
      "url",
      "description",
      "taxonomy",
      "wiki_description",
      "synonyms"
    ],
    modifiers: ["crops_fast", "similar_images"],
    plant_language: "en",
    api_key: PLANT_ID_API_KEY
  };

  let response;
  try {
    response = await fetch(PLANT_ID_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkErr) {
    throw new Error('Network error while connecting to Plant.id. Please check your internet connection.');
  }

  if (response.status === 401) throw new Error('Plant.id API key is invalid or expired.');
  if (response.status === 429) throw new Error('Plant.id rate limit exceeded. Please wait a moment and try again.');
  if (response.status === 404) throw new Error('Plant.id API endpoint not found. Please contact support.');
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Plant.id API error (${response.status}): ${errText || 'Unknown error'}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid response from Plant.id API.');
  }

  if (!data.suggestions || data.suggestions.length === 0) {
    throw new Error('No plant detected in this image. Please upload a clear photo of a plant or flower.');
  }

  return data;
}

/* ════════════════════════════════════════
   OPENROUTER AI CALL
════════════════════════════════════════ */
async function callOpenRouter(prompt, useModel) {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin || 'https://plantvision.ai',
      'X-Title': 'PlantVision AI'
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: 1800,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'You are a botanical expert who provides detailed, educational plant information in Hindi. Write beautifully formatted Hindi explanations using emojis as section headings. Be informative, accurate, and helpful.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Empty response from OpenRouter AI.');
  }

  const content = data.choices[0]?.message?.content;
  if (!content || content.trim() === '') {
    throw new Error('OpenRouter AI returned empty content.');
  }

  return content.trim();
}

async function generateHindiExplanation(plantName, scientificName, plantDetails) {
  const prompt = `
मुझे "${plantName}" (वैज्ञानिक नाम: ${scientificName}) के बारे में विस्तृत जानकारी हिंदी में दो।

निम्नलिखित सभी विषयों पर जानकारी दो, प्रत्येक section के लिए emoji heading का उपयोग करो:

🌱 **परिचय** - इस पौधे का संक्षिप्त परिचय

🔬 **वैज्ञानिक विवरण** - वैज्ञानिक नाम, परिवार, और वर्गीकरण

💊 **औषधीय उपयोग** - पारंपरिक और आधुनिक चिकित्सीय उपयोग

🪨 **मिट्टी की आवश्यकता** - कौन सी मिट्टी उपयुक्त है

💧 **पानी की आवश्यकता** - सिंचाई और नमी की जरूरत

☀️ **धूप की आवश्यकता** - कितनी धूप चाहिए

🌾 **खेती के सुझाव** - उगाने के व्यावहारिक सुझाव

📅 **उगाने का मौसम** - सबसे उचित मौसम और समय

🏛️ **सांस्कृतिक महत्व** - भारतीय संस्कृति और परंपराओं में महत्व

✨ **रोचक तथ्य** - कुछ दिलचस्प और अनजानी बातें

${plantDetails ? `अतिरिक्त जानकारी: ${plantDetails}` : ''}

कृपया सरल, स्पष्ट हिंदी में लिखो जो आम लोग आसानी से समझ सकें।
  `.trim();

  // Try primary model first
  try {
    return await callOpenRouter(prompt, PRIMARY_MODEL);
  } catch (primaryErr) {
    console.warn('Primary model failed, trying fallback:', primaryErr.message);
    // Fallback model
    try {
      return await callOpenRouter(prompt, FALLBACK_MODEL);
    } catch (fallbackErr) {
      throw new Error(`AI generation failed. Primary: ${primaryErr.message}. Fallback: ${fallbackErr.message}`);
    }
  }
}

/* ════════════════════════════════════════
   GENERATE CARD DETAILS (AI)
════════════════════════════════════════ */
async function generateCardDetails(plantName, scientificName) {
  const prompt = `
For the plant "${plantName}" (${scientificName}), provide ONLY a JSON object with these exact keys (no markdown, no explanation, just raw JSON):
{
  "uses": "2-3 primary uses (ornamental, medicinal, culinary, etc.)",
  "soil": "ideal soil type in 5-8 words",
  "water": "watering frequency in 5-8 words",
  "season": "best growing season in 5-8 words",
  "medicinal": "top 2-3 medicinal benefits in one sentence"
}
`.trim();

  try {
    let raw = await callOpenRouter(prompt, PRIMARY_MODEL);
    // Strip any markdown code fences
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    // Extract JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No JSON found in response');
  } catch {
    // Try fallback model
    try {
      let raw2 = await callOpenRouter(prompt, FALLBACK_MODEL);
      raw2 = raw2.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match2 = raw2.match(/\{[\s\S]*\}/);
      if (match2) return JSON.parse(match2[0]);
    } catch {}
    // Return generic defaults if AI fails
    return {
      uses: 'Ornamental, Medicinal',
      soil: 'Well-drained, fertile soil',
      water: 'Moderate watering, weekly',
      season: 'Spring and Summer',
      medicinal: 'Traditional medicinal uses vary by region.'
    };
  }
}

/* ════════════════════════════════════════
   RENDER RESULTS
════════════════════════════════════════ */
function renderResults(plantData, cardDetails, hindiText, imageDataUrl) {
  const top = plantData.suggestions[0];
  const commonName = (top.plant_details?.common_names?.[0]) || top.plant_name || 'Unknown Plant';
  const scientificName = top.plant_name || '—';
  const confidence = Math.round((top.probability || 0) * 100);

  // Header
  document.getElementById('resultPlantName').textContent = commonName;
  document.getElementById('resultScientific').textContent = scientificName;

  // Image
  document.getElementById('resultImg').src = imageDataUrl;

  // Confidence
  document.getElementById('confValue').textContent = confidence + '%';
  setTimeout(() => {
    document.getElementById('confBar').style.width = confidence + '%';
  }, 100);

  let tier = 'Low Confidence';
  if (confidence >= 85) tier = '🌟 Very High Confidence';
  else if (confidence >= 70) tier = '✅ High Confidence';
  else if (confidence >= 50) tier = '⚠️ Medium Confidence';
  else tier = '❓ Low Confidence — consider retaking photo';
  document.getElementById('confTier').textContent = tier;

  // Detail cards
  document.getElementById('dvUses').textContent = cardDetails.uses || '—';
  document.getElementById('dvSoil').textContent = cardDetails.soil || '—';
  document.getElementById('dvWater').textContent = cardDetails.water || '—';
  document.getElementById('dvSeason').textContent = cardDetails.season || '—';
  document.getElementById('dvMed').textContent = cardDetails.medicinal || '—';

  // Hindi content
  document.getElementById('hindiContent').textContent = hindiText || 'हिंदी विवरण उपलब्ध नहीं है।';

  // Show results
  document.getElementById('resultsSection').style.display = 'block';
  setTimeout(() => {
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ════════════════════════════════════════
   MAIN ANALYZE FUNCTION
════════════════════════════════════════ */
async function analyzePlant() {
  if (analysisRunning) return;

  if (!currentFile || !currentImageBase64) {
    showToast('Please upload a plant image first!', 'warning');
    return;
  }

  if (!PLANT_ID_API_KEY || PLANT_ID_API_KEY === 'PASTE_PLANT_ID_KEY') {
    showToast('Plant.id API key is not configured. Please add it to script.js.', 'error', 6000);
    return;
  }

  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'PASTE_OPENROUTER_KEY') {
    showToast('OpenRouter API key is not configured. Please add it to script.js.', 'error', 6000);
    return;
  }

  analysisRunning = true;
  const imageDataUrl = document.getElementById('previewImg').src;
  showLoading(imageDataUrl);

  try {
    // ── Step 1: Plant.id identification ──
    setStep(0, 15);
    showToast('Analyzing plant image...', 'info');

    let plantData;
    try {
      plantData = await identifyPlant(currentImageBase64);
    } catch (plantErr) {
      hideLoading();
      showToast(plantErr.message, 'error', 7000);
      analysisRunning = false;
      return;
    }

    const top = plantData.suggestions[0];
    const commonName = (top.plant_details?.common_names?.[0]) || top.plant_name || 'Unknown Plant';
    const scientificName = top.plant_name || 'Unknown';
    const wikiDesc = top.plant_details?.wiki_description?.value || '';

    setStep(1, 35);
    showToast(`Identified: ${commonName}! Generating details...`, 'success');

    // ── Step 2: Generate card details ──
    setStep(2, 55);
    let cardDetails = {};
    try {
      cardDetails = await generateCardDetails(commonName, scientificName);
    } catch (cardErr) {
      console.warn('Card details generation failed:', cardErr);
      cardDetails = {
        uses: 'Ornamental, Medicinal',
        soil: 'Well-drained soil',
        water: 'Regular watering',
        season: 'Spring to Summer',
        medicinal: 'Consult botanical resources for medicinal uses.'
      };
    }

    // ── Step 3: Generate Hindi explanation ──
    setStep(3, 75);
    showToast('Generating Hindi explanation...', 'info');

    let hindiText = '';
    try {
      hindiText = await generateHindiExplanation(commonName, scientificName, wikiDesc);
    } catch (hindiErr) {
      console.warn('Hindi generation failed:', hindiErr);
      hindiText = `${commonName} (${scientificName}) के बारे में विस्तृत जानकारी उत्पन्न नहीं हो सकी। कृपया पुनः प्रयास करें।`;
      showToast('Hindi explanation partially failed, showing available data.', 'warning');
    }

    // ── Finalize ──
    setStep(3, 100);
    await new Promise(r => setTimeout(r, 400));

    hideLoading();
    renderResults(plantData, cardDetails, hindiText, imageDataUrl);
    showToast('Analysis complete! 🌿', 'success', 5000);

  } catch (err) {
    console.error('Analysis error:', err);
    hideLoading();
    showToast(`Error: ${err.message || 'Unexpected error. Please try again.'}`, 'error', 7000);
  } finally {
    analysisRunning = false;
  }
}

/* ════════════════════════════════════════
   RESET APP
════════════════════════════════════════ */
function resetApp() {
  currentFile = null;
  currentImageBase64 = null;
  analysisRunning = false;

  document.getElementById('fileInput').value = '';
  document.getElementById('uploadIdle').style.display = 'flex';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('previewImg').src = '';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('progressBar').style.width = '0%';
  document.getElementById('confBar').style.width = '0%';
  document.getElementById('analyzeBtn').disabled = false;

  // Reset steps
  ['step1','step2','step3','step4'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
  });
  document.getElementById('step1').classList.add('active');

  document.getElementById('detect').scrollIntoView({ behavior: 'smooth' });
  showToast('Ready for a new plant! Upload an image to start.', 'info');
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  // Validate API keys on load
  if (PLANT_ID_API_KEY === 'PASTE_PLANT_ID_KEY' || OPENROUTER_API_KEY === 'PASTE_OPENROUTER_KEY') {
    setTimeout(() => {
      showToast('⚠️ API keys not configured. Please update script.js with your keys.', 'warning', 8000);
    }, 1500);
  }
});