import React, { useState, useEffect, useCallback } from "react";

const TIPOS_RECEITA = ["Sabonete", "Sabonete líquido", "Creme", "Perfume"];

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

function novoIngrediente() {
  return { key: Math.random().toString(36).slice(2), nome: "", quantidade: "", unidade: "" };
}

function receitaVazia() {
  return {
    id: null,
    nome: "",
    tipo: TIPOS_RECEITA[0],
    foto: null,
    ingredientes: [novoIngrediente()],
    modoPreparo: "",
  };
}

// Redimensiona e comprime a imagem antes de guardar, para não estourar o limite de armazenamento
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
      <label className="flex flex-col gap-1" style={{ width: 100 }}>
        <Etiqueta>Quantidade</Etiqueta>
        <input
          type="number"
          value={ingrediente.quantidade}
          onChange={(e) => onMudar({ ...ingrediente, quantidade: e.target.value })}
          style={{ border: `1px solid ${PALETA.linha}`, fontFamily: "'IBM Plex Mono', monospace" }}
          className="rounded-md px-2 py-1.5 text-sm w-full bg-white"
        />
      </label>
      <label className="flex flex-col gap-1" style={{ width: 100 }}>
        <Etiqueta>Unidade</Etiqueta>
        <input
          value={ingrediente.unidade}
          onChange={(e) => onMudar({ ...ingrediente, unidade: e.target.value })}
          placeholder="g, ml, gotas..."
          style={{ border: `1px solid ${PALETA.linha}`, fontFamily: "'Work Sans', sans-serif" }}
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

function FormularioReceita({ inicial, onSalvar, onCancelar }) {
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
          {inicial.id ? "Editar receita" : "Nova receita"}
        </h2>
        <button onClick={onCancelar} style={{ color: PALETA.tintaSuave }} className="text-sm hover:underline">
          Voltar
        </button>
      </div>

      <div className="flex flex-wrap gap-5">
        <CampoFoto foto={receita.foto} onMudar={(v) => setReceita({ ...receita, foto: v })} />
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
          onClick={() => onSalvar(receita)}
          style={{ background: PALETA.tinta, color: PALETA.papel }}
          className="px-5 py-2 rounded-md text-sm font-medium"
        >
          Salvar receita
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
              onExcluir(receita.id);
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
      </div>
    </div>
  );
}

export default function CadernoSaboaria() {
  useGoogleFonts();
  const [receitas, setReceitas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tela, setTela] = useState("lista");
  const [receitaAtual, setReceitaAtual] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  useEffect(() => {
    (async () => {
      try {
        const resultado = await window.storage.get("receitas");
        if (resultado && resultado.value) {
          setReceitas(JSON.parse(resultado.value));
        }
      } catch (e) {
        // chave ainda não existe — normal na primeira vez
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const persistir = useCallback(async (novaLista) => {
    setReceitas(novaLista);
    try {
      const ok = await window.storage.set("receitas", JSON.stringify(novaLista));
      if (!ok) setErro("Não foi possível salvar. Tente novamente.");
      else setErro(null);
    } catch (e) {
      setErro("Não foi possível salvar. Tente novamente.");
    }
  }, []);

  const salvarReceita = (receita) => {
    if (receita.id) {
      persistir(receitas.map((r) => (r.id === receita.id ? receita : r)));
    } else {
      persistir([...receitas, { ...receita, id: Date.now().toString(36) + Math.random().toString(36).slice(2) }]);
    }
    setTela("lista");
    setReceitaAtual(null);
  };

  const excluirReceita = (id) => {
    if (window.confirm("Excluir esta receita? Essa ação não pode ser desfeita.")) {
      persistir(receitas.filter((r) => r.id !== id));
    }
  };

  const receitasFiltradas = receitas.filter((r) => {
    const combinaBusca = r.nome.toLowerCase().includes(busca.toLowerCase());
    const combinaTipo = filtroTipo === "Todos" || r.tipo === filtroTipo;
    return combinaBusca && combinaTipo;
  });

  return (
    <div style={{ background: PALETA.fundo, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }} className="p-5 md:p-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <Etiqueta>Saboaria artesanal</Etiqueta>
          <h1 style={{ fontFamily: "'Fraunces', serif", color: PALETA.tinta }} className="text-4xl">
            Karolina Guidini
          </h1>
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
                      setReceitaAtual(rec);
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
