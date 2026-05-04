// ===========================
// API util + Auth
// ===========================
const api = (p, opt = {}) =>
  fetch(p, {
    ...opt,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (localStorage.token || ""),
      ...(opt.headers || {}),
    },
  }).then((r) => r.json());

function renderAuth() {
  const box = document.getElementById("authBox");
  if (!box) return;
  if (localStorage.token) {
    box.innerHTML = `
      <span class="text-sm">Logado: ${localStorage.name || ""}</span>
      <button id="logout" class="px-3 py-1 rounded border ml-2">Sair</button>`;
    document.getElementById("logout").onclick = () => {
      localStorage.clear();
      renderAuth();
    };
  } else {
    box.innerHTML = `<a href="login.html" class="px-3 py-1 rounded border">Entrar</a>`;
  }
}

// ===========================
// Helpers & Validações
// ===========================
function maskCPF(value) {
  let v = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  return v;
}
function cpfValido(masked) {
  const cpf = String(masked || "").replace(/\D/g, "");
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}
function maskTelefone(value) {
  let v = String(value || "").replace(/\D/g, "").slice(0, 11);
  return v.length <= 10
    ? v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
    : v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function emailValido(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return re.test(e);
}
function showError(id, msg) {
  const el = document.getElementById(id);
  const err = document.getElementById(`err-${id}`);
  if (!el || !err) return;
  err.textContent = msg || "";
  err.classList.toggle("hidden", !msg);
  el.classList.toggle("is-error", !!msg);
}
function clearErrors() {
  ["cliNome", "cliCPF", "cliEmail", "cliTel"].forEach((id) => showError(id, ""));
}
function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, "_");
}

// ===========================
// Persistência
// ===========================
function listarClientes() { return JSON.parse(localStorage.getItem("clientes")) || []; }
function listarChecklists() { return JSON.parse(localStorage.getItem("checklists")) || []; }
function salvarChecklist(checklist) {
  const salvos = listarChecklists();
  salvos.push(checklist);
  localStorage.setItem("checklists", JSON.stringify(salvos));
}
function atualizarChecklist(index, checklist) {
  const salvos = listarChecklists();
  salvos[index] = checklist;
  localStorage.setItem("checklists", JSON.stringify(salvos));
}
function excluirChecklist(index) {
  if (!confirm("Excluir checklist?")) return;
  const salvos = listarChecklists();
  salvos.splice(index, 1);
  localStorage.setItem("checklists", JSON.stringify(salvos));
  renderSavedChecklists();
}
function salvarOuAtualizarCliente(cliente) {
  let clientes = listarClientes();
  const idx = clientes.findIndex(c => c.cpf === cliente.cpf);
  if (idx >= 0) clientes[idx] = cliente;
  else clientes.push(cliente);
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

// ===========================
// Checklist
// ===========================
const checklistItens = [
  "Buzina","Alertas no painel","Volante/Direção","Lavador/Limpador de para-brisa (FR/TR)",
  "Iluminação externa (FR/TR/FRE/NBL)","Difusores de ar","Ar Condicionado (Quente/Frio)",
  "Trilhos dos bancos (DE/DD)","Cintos de segurança (DE/DD/TE/TD)",
  "Acionamento dos Vidros (DE/DD/TE/TD)","Trava das Portas","Freio de Estacionamento",
  "Pedal de Freio","Pedal de Embreagem (se equipado)"
];
let editIndex = null;

function renderChecklist() {
  const container = document.getElementById("checklistItems");
  container.innerHTML = "";
  checklistItens.forEach(item => {
    const div = document.createElement("div");
    div.className = "p-4 border rounded-lg bg-slate-800/70";
    div.innerHTML = `
      <p class="font-semibold mb-2">${item}</p>
      <div class="flex gap-4">
        <label><input type="radio" name="${item}" value="BOM"> <span class="text-green-400">BOM</span></label>
        <label><input type="radio" name="${item}" value="REGULAR"> <span class="text-yellow-400">REGULAR</span></label>
        <label><input type="radio" name="${item}" value="RUIM"> <span class="text-red-400">RUIM</span></label>
      </div>`;
    container.appendChild(div);
  });
}

function resetForm() {
  document.querySelectorAll("input, textarea").forEach(el => { el.value = ""; });
  document.getElementById("previewFoto")?.classList.add("hidden");
  renderChecklist();
  document.getElementById("saveCl")?.classList.remove("hidden");
  document.getElementById("updateCl")?.classList.add("hidden");
  clearErrors();
  editIndex = null;
}

// ===========================
// Documento + Impressão
// ===========================
function montarHTMLParaDocumento(checklist) {
  return `
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif;">
      <h1 style="text-align:center; color:#2563eb;">Racing Technology - RT</h1>
      <h2>Checklist de Veículo</h2>
      <p><strong>Cliente:</strong> ${checklist.cliente.nome} - ${checklist.cliente.cpf}</p>
      <p><strong>Email:</strong> ${checklist.cliente.email} | <strong>Tel:</strong> ${checklist.cliente.tel}</p>
      <p><strong>Carro:</strong> ${checklist.carro.modelo} - ${checklist.carro.placa}</p>
      <p><strong>Problemas:</strong> ${checklist.carro.problemas || "-"}</p>
      ${checklist.carro.foto ? `<img src="${checklist.carro.foto}" width="200"/>` : ""}
      <ul>
        ${Object.entries(checklist.itens).map(([k,v]) => `<li>${k}: <b>${v}</b></li>`).join("")}
      </ul>
      <br>
      <div style="text-align:center;">
        <canvas id="printQR"></canvas>
      </div>
    </body></html>`;
}

function imprimirChecklist(i) {
  const salvos = listarChecklists();
  const cl = salvos[i];
  const html = montarHTMLParaDocumento(cl);
  const w = window.open("", "PRINT", "height=800,width=1000");
  w.document.write(html);
  w.document.close();

  w.onload = () => {
    const qrCanvas = w.document.getElementById("printQR");
    if (qrCanvas) {
      QRCode.toCanvas(qrCanvas, "https://www.instagram.com/robertmacanico011", { width: 120 }, () => {
        setTimeout(() => w.print(), 300);
      });
    } else {
      setTimeout(() => w.print(), 300);
    }
  };
}

// ===========================
// PDF Export
// ===========================
async function baixarChecklistPDF(i) {
  const { jsPDF } = window.jspdf;
  const salvos = listarChecklists();
  const cl = salvos[i];
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text("Racing Technology - RT", 105, 15, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Checklist de Veículo", 14, 30);

  doc.setFontSize(11);
  doc.text(`Cliente: ${cl.cliente.nome} - ${cl.cliente.cpf}`, 14, 45);
  doc.text(`Email: ${cl.cliente.email} | Tel: ${cl.cliente.tel}`, 14, 55);
  doc.text(`Carro: ${cl.carro.modelo} - Placa: ${cl.carro.placa}`, 14, 65);
  doc.text(`Problemas: ${cl.carro.problemas || "-"}`, 14, 75);

  let y = 90;
  Object.entries(cl.itens).forEach(([k, v]) => {
    doc.text(`${k}: ${v}`, 14, y);
    y += 7;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  if (cl.carro.foto) {
    try {
      doc.addImage(cl.carro.foto, "JPEG", 140, 40, 60, 45);
    } catch(e) {
      console.error("Erro ao inserir imagem", e);
    }
  }

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, "https://www.instagram.com/robertmacanico011");
  const qrData = qrCanvas.toDataURL("image/png");
  doc.addImage(qrData, "PNG", 150, 250, 40, 40);

  const fileName = `checklist-${sanitizeFileName(cl.cliente.nome)}-${sanitizeFileName(cl.carro.placa)}.pdf`;
  doc.save(fileName);
}

// ===========================
// Render list
// ===========================
function renderSavedChecklists() {
  const list = document.getElementById("clList");
  list.innerHTML = "";
  const salvos = listarChecklists();
  salvos.forEach((cl,i) => {
    const div = document.createElement("div");
    div.className = "p-4 border rounded-lg bg-slate-800/70 flex justify-between items-center";
    div.innerHTML = `
      <div>
        <p><strong>${cl.cliente.nome}</strong> (${cl.cliente.cpf})</p>
        <p>${cl.carro.modelo} - Placa: ${cl.carro.placa}</p>
        <p class="text-sm text-gray-300">${cl.cliente.email} | ${cl.cliente.tel}</p>
      </div>
      <div class="flex gap-2">
        <button class="px-3 py-1 bg-blue-600 rounded" onclick="editarChecklist(${i})">Editar</button>
        <button class="px-3 py-1 bg-red-600 rounded" onclick="excluirChecklist(${i})">Excluir</button>
        <button class="px-3 py-1 bg-gray-600 rounded" onclick="imprimirChecklist(${i})">Imprimir</button>
        <button class="px-3 py-1 bg-green-600 rounded" onclick="baixarChecklistPDF(${i})">Baixar PDF</button>
      </div>`;
    list.appendChild(div);
  });
}
function editarChecklist(i) {
  const salvos = listarChecklists();
  const cl = salvos[i];
  document.getElementById("cliNome").value = cl.cliente.nome;
  document.getElementById("cliCPF").value = cl.cliente.cpf;
  document.getElementById("cliEmail").value = cl.cliente.email;
  document.getElementById("cliTel").value = cl.cliente.tel;
  document.getElementById("carModelo").value = cl.carro.modelo;
  document.getElementById("carPlaca").value = cl.carro.placa;
  document.getElementById("carProblemas").value = cl.carro.problemas;
  if (cl.carro.foto) {
    const preview = document.getElementById("previewFoto");
    preview.src = cl.carro.foto;
    preview.classList.remove("hidden");
  }
  renderChecklist();
  Object.entries(cl.itens).forEach(([k,v])=>{
    const input = document.querySelector(`input[name="${k}"][value="${v}"]`);
    if (input) input.checked = true;
  });
  document.getElementById("saveCl").classList.add("hidden");
  document.getElementById("updateCl").classList.remove("hidden");
  editIndex = i;
}

// ===========================
// Eventos
// ===========================
window.onload = () => {
  renderAuth();
  renderChecklist();
  renderSavedChecklists();

  QRCode.toCanvas(
    document.getElementById("qrcodePage"),
    window.location.href,
    { width: 120 }
  );

  const cpfEl = document.getElementById("cliCPF");
  cpfEl.addEventListener("input", e => e.target.value = maskCPF(e.target.value));
  const telEl = document.getElementById("cliTel");
  telEl.addEventListener("input", e => e.target.value = maskTelefone(e.target.value));

  const fileEl = document.getElementById("carFoto");
  const preview = document.getElementById("previewFoto");
  fileEl.addEventListener("change", e => {
    const f = e.target.files[0];
    if (f) {
      const r = new FileReader();
      r.onload = ev => { preview.src = ev.target.result; preview.classList.remove("hidden"); };
      r.readAsDataURL(f);
    }
  });

  document.getElementById("resetCl").onclick = resetForm;
  document.getElementById("saveCl").onclick = () => {
    clearErrors();
    const nome = document.getElementById("cliNome").value.trim();
    const cpf = document.getElementById("cliCPF").value.trim();
    const email = document.getElementById("cliEmail").value.trim();
    const tel = document.getElementById("cliTel").value.trim();
    const modelo = document.getElementById("carModelo").value.trim();
    const placa = document.getElementById("carPlaca").value.trim();
    const problemas = document.getElementById("carProblemas").value.trim();
    const foto = preview.src && !preview.classList.contains("hidden") ? preview.src : "";
    let hasErr = false;
    if (!nome) { showError("cliNome","Nome obrigatório"); hasErr=true; }
    if (!cpfValido(cpf)) { showError("cliCPF","CPF inválido"); hasErr=true; }
    if (!emailValido(email)) { showError("cliEmail","E-mail inválido"); hasErr=true; }
    if (!tel) { showError("cliTel","Telefone obrigatório"); hasErr=true; }
    if (hasErr) return;
    const itens = {};
    checklistItens.forEach(it=>{
      const input = document.querySelector(`input[name="${it}"]:checked`);
      itens[it] = input ? input.value : "NÃO INFORMADO";
    });
    const checklist = {
      cliente:{nome,cpf,email,tel},
      carro:{modelo,placa,problemas,foto},
      itens
    };
    salvarChecklist(checklist);
    salvarOuAtualizarCliente(checklist.cliente);
    resetForm();
    renderSavedChecklists();
  };
  document.getElementById("updateCl").onclick = () => {
    if (editIndex===null) return;
    clearErrors();
    const nome = document.getElementById("cliNome").value.trim();
    const cpf = document.getElementById("cliCPF").value.trim();
    const email = document.getElementById("cliEmail").value.trim();
    const tel = document.getElementById("cliTel").value.trim();
    const modelo = document.getElementById("carModelo").value.trim();
    const placa = document.getElementById("carPlaca").value.trim();
    const problemas = document.getElementById("carProblemas").value.trim();
    const foto = preview.src && !preview.classList.contains("hidden") ? preview.src : "";
    let hasErr = false;
    if (!nome) { showError("cliNome","Nome obrigatório"); hasErr=true; }
    if (!cpfValido(cpf)) { showError("cliCPF","CPF inválido"); hasErr=true; }
    if (!emailValido(email)) { showError("cliEmail","E-mail inválido"); hasErr=true; }
    if (!tel) { showError("cliTel","Telefone obrigatório"); hasErr=true; }
    if (hasErr) return;
    const itens = {};
    checklistItens.forEach(it=>{
      const input = document.querySelector(`input[name="${it}"]:checked`);
      itens[it] = input ? input.value : "NÃO INFORMADO";
    });
    const checklist = {
      cliente:{nome,cpf,email,tel},
      carro:{modelo,placa,problemas,foto},
      itens
    };
    atualizarChecklist(editIndex, checklist);
    salvarOuAtualizarCliente(checklist.cliente);
    resetForm();
    renderSavedChecklists();
  };
  // Verifica se veio da tela de Usuários para edição
  const cpfEdicao = localStorage.getItem("editUsuarioCPF");
  if (cpfEdicao) {
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const u = usuarios.find(x => x.cpf === cpfEdicao);
    if (u) {
      document.getElementById("cliNome").value = u.nome;
      document.getElementById("cliCPF").value = u.cpf;
      document.getElementById("cliEmail").value = u.email;
      document.getElementById("cliTel").value = u.tel;
    }
    localStorage.removeItem("editUsuarioCPF");
  }

};

// ===========================
// Conformidade (LGPD & Compliance)
// ===========================
function listarConformidades() {
  return JSON.parse(localStorage.getItem("conformidades")) || [];
}
function salvarConformidade(entry) {
  const arr = listarConformidades();
  arr.push(entry);
  localStorage.setItem("conformidades", JSON.stringify(arr));
}
function temConformidade(cpf, serie) {
  return listarConformidades().find(c => c.cpf === cpf && c.serie === serie && c.certified);
}

// Ao clicar em "Conforme" na tela de Teste
function requestConformidadeBeforeOK(cpf, serie) {
  const conf = temConformidade(cpf, serie);
  if (conf) {
    salvarTeste(cpf, serie, "OK");
    if (typeof render === "function") render();
    return;
  }
  localStorage.setItem("pendingConformidade", JSON.stringify({ cpf, serie }));
  window.location.href = "conformidade.html";
}

// Caso volte da conformidade.html
(function checkJustCertified() {
  try {
    const data = localStorage.getItem("justCertified");
    if (!data) return;
    const obj = JSON.parse(data);
    localStorage.removeItem("justCertified");
    if (temConformidade(obj.cpf, obj.serie)) {
      salvarTeste(obj.cpf, obj.serie, "OK");
      if (typeof render === "function") {
        setTimeout(() => { try { render(); } catch(e){} }, 50);
      }
    }
  } catch (e) {
    console.error("Erro verificando certificação LGPD:", e);
  }
})();
