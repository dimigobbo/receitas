import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";
import logo from "./assets/logo.png";

const TIPOS_RECEITA = ["Corpo", "Casa"];

const PALETA = {
  fundo: "#E8E2D3",
  papel: "#F7F1E4",
  tinta: "#2B2620",
  tintaSuave: "#5C564A",
  linha: "#D6CCB4",
  oliva: "#B08D57",
  perigo: "#9C4C3C",
};

function useGoogleFonts() {
  useEffect(() => {
    const id = "caderno-saboaria-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

function gerarId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Remove acentos e caixa alta para permitir busca "sem acento" (ex.: "sabao" encontra "sabão")
function normalizar(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function novoIngrediente() {
  return { key: gerarId(), nome: "", quantidade: "" };
}

function receitaVazia() {
  return {
    id: gerarId(),
    novo: true,
    nome: "",
    tipo: TIPOS_RECEITA[0],
    foto: null,
    ingredientes: [novoIngrediente()],
    rendimento: "",
    embalagem: "",
    modoPreparo: "",
  };
}

// Redimensiona e comprime a imagem para um data URL (base64) pequeno o
// suficiente para caber tranquilamente dentro do documento do Firestore
// (limite de 1MB por documento).
function comprimirImagem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
      img.onload = () => {
        const maxLado = 700;
        let { width, height } = img;
        if (width > height && width > maxLado) {
          height = Math.round((height * maxLado) / width);
          width = maxLado;
        } else if (height > maxLado) {
          width = Math.round((width * maxLado) / height);
          height = maxLado;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Etiqueta({ children }) {
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color: PALETA.tintaSuave,
        letterSpacing: "0.06em",
        fontSize: 11,
      }}
      className="uppercase"
    >
      {children}
    </span>
  );
}

function CampoTexto({ label, value, onChange, placeholder, area }) {
  const Comp = area ? "textarea" : "input";
  return (
    <label className="flex flex-col gap-1 w-full">
      <Etiqueta>{label}</Etiqueta>
      <Comp
        value={value}
        placeholder={placeholder}
        rows={area ? 5 : undefined}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "'Work Sans', sans-serif",
          border: `1px solid ${PALETA.linha}`,
          color: PALETA.tinta,
          background: "#fff",
        }}
        className="rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 resize-none"
      />
    </label>
  );
}

function CampoFoto({ foto, onMudar }) {
  const inputRef = React.useRef(null);
  const [carregando, setCarregando] = useState(false);

  const escolherArquivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCarregando(true);
    try {
      const dataUrl = await comprimirImagem(file);
      onMudar(dataUrl);
    } catch (err) {
      // silenciosamente ignora falha de leitura de imagem
    } finally {
      setCarregando(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Etiqueta>Foto</Etiqueta>
      {foto ? (
        <div className="relative w-40">
          <img
            src={foto}
            alt="Foto da receita"
            style={{ borderRadius: 12, border: `1px solid ${PALETA.linha}` }}
            className="w-40 h-40 object-cover"
          />
          <button
            onClick={() => onMudar(null)}
            style={{ background: PALETA.papel, color: PALETA.perigo, border: `1px solid ${PALETA.linha}` }}
            className="absolute top-1 right-1 text-xs px-2 py-0.5 rounded-md"
          >
            Remover
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current && inputRef.current.click()}
          style={{ border: `1px dashed ${PALETA.linha}`, color: PALETA.tintaSuave }}
          className="w-40 h-40 rounded-xl flex items-center justify-center text-xs text-center px-3"
        >
          {carregando ? "Carregando..." : "+ Adicionar foto"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={escolherArquivo} className="hidden" />
    </div>
  );
}

function LinhaIngrediente({ ingrediente, onMudar, onRemover, podeRemover }) {
  return (
    <div className="flex flex-wrap items-end gap-2 py-2" style={{ borderBottom: `1px dashed ${PALETA.linha}` }}>
      <label className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <Etiqueta>Ingrediente</Etiqueta>
        <input
          value={ingrediente.nome}
          onChange={(e) => onMudar({ ...ingrediente, nome: e.target.value })}
          placeholder="Ex.: Óleo de coco"
          style={{ border: `1px solid ${PALETA.linha}`, fontFamily: "'Work Sans', sans-serif" }}
          className="rounded-md px-2 py-1.5 text-sm w-full bg-white"
        />
      </label>
      <label className="flex flex-col gap-1" style={{ width: 120 }}>
        <Etiqueta>Quantidade</Etiqueta>
        <input
          value={ingrediente.quantidade}
          onChange={(e) => onMudar({ ...ingrediente, quantidade: e.target.value })}
          placeholder="Ex.: 100g"
          style={{ border: `1px solid ${PALETA.linha}`, fontFamily: "'IBM Plex Mono', monospace" }}
          className="rounded-md px-2 py-1.5 text-sm w-full bg-white"
        />
      </label>
      {podeRemover && (
        <button
          onClick={onRemover}
          style={{ color: PALETA.perigo }}
          className="text-xs px-2 py-1.5 rounded-md hover:bg-black/5"
        >
          Remover
        </button>
      )}
    </div>
  );
}

function FormularioReceita({ inicial, onSalvar, onCancelar, salvando }) {
  const [receita, setReceita] = useState(inicial);

  const mudarIngrediente = (idx, novo) => {
    const ingredientes = [...receita.ingredientes];
    ingredientes[idx] = novo;
    setReceita({ ...receita, ingredientes });
  };
  const removerIngrediente = (idx) => {
    setReceita({ ...receita, ingredientes: receita.ingredientes.filter((_, i) => i !== idx) });
  };
  const adicionarIngrediente = () =>
    setReceita({ ...receita, ingredientes: [...receita.ingredientes, novoIngrediente()] });

  return (
    <div style={{ background: PALETA.papel, border: `1px solid ${PALETA.linha}`, borderRadius: 18 }} className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontFamily: "'Fraunces', serif", color: PALETA.tinta }} className="text-2xl">
          {inicial.novo ? "Nova receita" : "Editar receita"}
        </h2>
        <button onClick={onCancelar} style={{ color: PALETA.tintaSuave }} className="text-sm hover:underline">
          Voltar
        </button>
      </div>

      <div className="flex flex-wrap gap-5">
        <CampoFoto foto={receita.foto} onMudar={(dataUrl) => setReceita({ ...receita, foto: dataUrl })} />
        <div className="flex-1 min-w-[220px] flex flex-col gap-3">
          <CampoTexto label="Nome da receita" value={receita.nome} onChange={(v) => setReceita({ ...receita, nome: v })} placeholder="Ex.: Barra de lavanda e aveia" />
          <label className="flex flex-col gap-1">
            <Etiqueta>Tipo</Etiqueta>
            <select
              value={receita.tipo}
              onChange={(e) => setReceita({ ...receita, tipo: e.target.value })}
              style={{ border: `1px solid ${PALETA.linha}`, fontFamily: "'Work Sans', sans-serif" }}
              className="rounded-md px-2 py-2 text-sm bg-white"
            >
              {TIPOS_RECEITA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Etiqueta>Ingredientes</Etiqueta>
          <button onClick={adicionarIngrediente} style={{ color: PALETA.oliva }} className="text-xs font-medium hover:underline">
            + adicionar ingrediente
          </button>
        </div>
        {receita.ingredientes.map((ing, i) => (
          <LinhaIngrediente
            key={ing.key}
            ingrediente={ing}
            onMudar={(novo) => mudarIngrediente(i, novo)}
            onRemover={() => removerIngrediente(i)}
            podeRemover={receita.ingredientes.length > 1}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[160px]">
          <CampoTexto
            label="Rendimento"
            value={receita.rendimento}
            onChange={(v) => setReceita({ ...receita, rendimento: v })}
            placeholder="Ex.: 20 barras de 100g"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <CampoTexto
            label="Tipo de embalagem"
            value={receita.embalagem}
            onChange={(v) => setReceita({ ...receita, embalagem: v })}
            placeholder="Ex.: Saco kraft + etiqueta"
          />
        </div>
      </div>

      <CampoTexto
        label="Modo de preparo"
        value={receita.modoPreparo}
        onChange={(v) => setReceita({ ...receita, modoPreparo: v })}
        area
        placeholder="Passo a passo da receita, temperatura de trabalho, tempo de mistura, observações do lote..."
      />

      <div className="flex justify-end gap-3">
        <button onClick={onCancelar} style={{ color: PALETA.tintaSuave }} className="px-4 py-2 rounded-md text-sm hover:bg-black/5">
          Cancelar
        </button>
        <button
          disabled={salvando}
          onClick={() => onSalvar(receita)}
          style={{ background: PALETA.tinta, color: PALETA.papel, opacity: salvando ? 0.6 : 1 }}
          className="px-5 py-2 rounded-md text-sm font-medium"
        >
          {salvando ? "Salvando..." : "Salvar receita"}
        </button>
      </div>
    </div>
  );
}

function RecipeCard({ receita, onAbrir, onExcluir }) {
  return (
    <div
      onClick={() => onAbrir(receita)}
      style={{ background: PALETA.papel, border: `1px solid ${PALETA.linha}`, borderRadius: 18 }}
      className="p-5 cursor-pointer hover:shadow-md transition-shadow flex gap-4"
    >
      {receita.foto ? (
        <img
          src={receita.foto}
          alt={receita.nome}
          style={{ borderRadius: 12, flexShrink: 0 }}
          className="w-20 h-20 object-cover"
        />
      ) : (
        <div
          style={{ borderRadius: 12, border: `1px dashed ${PALETA.linha}`, color: PALETA.tintaSuave, flexShrink: 0 }}
          className="w-20 h-20 flex items-center justify-center text-[10px] text-center px-1"
        >
          sem foto
        </div>
      )}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", color: PALETA.tinta }} className="text-xl leading-tight truncate">
              {receita.nome || "Sem nome"}
            </h3>
            <Etiqueta>{receita.tipo}</Etiqueta>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExcluir(receita);
            }}
            style={{ color: PALETA.perigo }}
            className="text-xs px-2 py-1 rounded-md hover:bg-black/5 shrink-0"
          >
            Excluir
          </button>
        </div>
        <p style={{ color: PALETA.tintaSuave }} className="text-xs truncate">
          {(receita.ingredientes || [])
            .filter((i) => i.nome)
            .map((i) => i.nome)
            .join(", ") || "Nenhum ingrediente adicionado"}
        </p>
        {(receita.rendimento || receita.embalagem) && (
          <div className="flex flex-wrap gap-x-3">
            {receita.rendimento && <Etiqueta>Rende: {receita.rendimento}</Etiqueta>}
            {receita.embalagem && <Etiqueta>Emb.: {receita.embalagem}</Etiqueta>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  useGoogleFonts();
  const [receitas, setReceitas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tela, setTela] = useState("lista");
  const [receitaAtual, setReceitaAtual] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "receitas"),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
        setReceitas(lista);
        setCarregando(false);
        setErro(null);
      },
      (err) => {
        setErro("Não foi possível carregar as receitas do Firebase.");
        setCarregando(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const salvarReceita = async (receita) => {
    setSalvando(true);
    try {
      const dados = {
        nome: receita.nome,
        tipo: receita.tipo,
        foto: receita.foto || null,
        ingredientes: receita.ingredientes,
        rendimento: receita.rendimento || "",
        embalagem: receita.embalagem || "",
        modoPreparo: receita.modoPreparo,
        criadoEm: receita.criadoEm || Date.now(),
      };

      await setDoc(doc(db, "receitas", receita.id), dados);
      setTela("lista");
      setReceitaAtual(null);
      setErro(null);
    } catch (e) {
      setErro("Não foi possível salvar a receita. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirReceita = async (receita) => {
    if (!window.confirm("Excluir esta receita? Essa ação não pode ser desfeita.")) return;
    try {
      await deleteDoc(doc(db, "receitas", receita.id));
    } catch (e) {
      setErro("Não foi possível excluir a receita.");
    }
  };

  const receitasFiltradas = receitas.filter((r) => {
    const combinaBusca = normalizar(r.nome).includes(normalizar(busca));
    const combinaTipo = filtroTipo === "Todos" || r.tipo === filtroTipo;
    return combinaBusca && combinaTipo;
  });

  return (
    <div style={{ background: PALETA.fundo, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="p-5 md:p-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <header className="flex justify-center sm:justify-start">
          <img src={logo} alt="Karolina Guidini — Saboaria Artesanal" className="h-24 w-24 sm:h-28 sm:w-28 object-contain" />
        </header>

        {erro && (
          <div style={{ background: "#F4E1DC", color: PALETA.perigo, borderRadius: 10 }} className="px-4 py-2 text-sm">
            {erro}
          </div>
        )}

        {tela === "lista" && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar receita..."
                style={{ border: `1px solid ${PALETA.linha}`, background: "#fff", color: PALETA.tinta }}
                className="rounded-md px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-2"
              />
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                style={{ border: `1px solid ${PALETA.linha}`, background: "#fff", color: PALETA.tinta }}
                className="rounded-md px-3 py-2 text-sm"
              >
                <option>Todos</option>
                {TIPOS_RECEITA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setReceitaAtual(receitaVazia());
                  setTela("form");
                }}
                style={{ background: PALETA.tinta, color: PALETA.papel }}
                className="px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
              >
                + Nova receita
              </button>
            </div>

            {carregando ? (
              <p style={{ color: PALETA.tintaSuave }} className="text-sm">Carregando receitas...</p>
            ) : receitasFiltradas.length === 0 ? (
              <div style={{ border: `1px dashed ${PALETA.linha}`, borderRadius: 18 }} className="p-10 text-center">
                <p style={{ fontFamily: "'Fraunces', serif", color: PALETA.tinta }} className="text-lg mb-1">
                  {receitas.length === 0 ? "Ainda não há receitas por aqui" : "Nenhuma receita encontrada"}
                </p>
                <p style={{ color: PALETA.tintaSuave }} className="text-sm">
                  {receitas.length === 0 ? "Comece registrando a primeira formulação do ateliê." : "Tente ajustar a busca ou o filtro."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {receitasFiltradas.map((r) => (
                  <RecipeCard
                    key={r.id}
                    receita={r}
                    onAbrir={(rec) => {
                      setReceitaAtual({ ...rec, novo: false });
                      setTela("form");
                    }}
                    onExcluir={excluirReceita}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tela === "form" && (
          <FormularioReceita
            inicial={receitaAtual}
            salvando={salvando}
            onSalvar={salvarReceita}
            onCancelar={() => {
              setTela("lista");
              setReceitaAtual(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
