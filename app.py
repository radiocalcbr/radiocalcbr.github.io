import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, date, timedelta
import json
import uuid
import calendar
import pytz
import firebase_admin
from firebase_admin import credentials, firestore

# ======================= CONFIG =======================
FUSO = pytz.timezone('America/Sao_Paulo')

CATEGORIAS_PADRAO = ["Alimentação", "Transporte", "Moradia", "Lazer",
                     "Saúde", "Educação", "Compras", "Contas", "Outros"]
FORMAS_PAGAMENTO = ["PIX", "Débito", "Crédito", "Dinheiro", "Boleto", "Transferência"]
PESSOAS = ["Jeany", "Rafael", "Jeany e Rafael"]
CLASSIFICACOES = ["Essencial", "Não Essencial"]

st.set_page_config(page_title="Controle de Custos", page_icon="💰", layout="wide")

import os
import base64
import json

if not firebase_admin._apps:
    if os.path.exists("firebase-key.json"):
        # No seu PC: lê do arquivo local
        cred = credentials.Certificate("firebase-key.json")
    else:
        # Na nuvem: lê do Base64 no Secrets e converte para JSON
        b64_str = st.secrets["firebase_json_b64"]
        json_str = base64.b64decode(b64_str).decode("utf-8")
        cred = credentials.Certificate(json.loads(json_str))
        
    firebase_admin.initialize_app(cred)
db = firestore.client()

# ⚡ CSS com cores fixas (tema escuro)
st.markdown("""
<style>
.main-title {
    font-size: 2.2rem !important;
    font-weight: 700 !important;
    color: #e8eaed !important;
    margin-bottom: 0 !important;
    display: inline-block !important;
}
.subtitle {
    opacity: 0.7;
    font-size: 0.9rem;
    margin-top: -5px;
    margin-bottom: 20px;
}
[data-testid="stMetric"] {
    background-color: #1e1f22;
    border: 1px solid #2d2f34;
    padding: 14px 18px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    overflow: visible !important;
    min-width: 0 !important;
}
[data-testid="stMetricLabel"] {
    font-size: 0.85rem;
    color: #9aa0a6;
    white-space: normal !important;
}
[data-testid="stMetricValue"] {
    font-size: 1.4rem;
    color: #e8eaed;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    line-height: 1.1 !important;
}
.stButton > button {
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.15s ease;
}
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    border: none;
    color: white;
}
.stButton > button[kind="primary"]:hover {
    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
    transform: translateY(-1px);
}
[data-testid="stExpander"] {
    border: 1px solid #2d2f34;
    border-radius: 10px;
    background-color: #1e1f22;
}
.stTextInput input, .stNumberInput input, .stDateInput input {
    border-radius: 8px !important;
    background-color: #1e1f22 !important;
    color: #e8eaed !important;
    border-color: #3c4043 !important;
}
[data-baseweb="select"] > div {
    border-radius: 8px !important;
    background-color: #1e1f22 !important;
    border-color: #3c4043 !important;
    color: #e8eaed !important;
}
hr {
    margin: 1.2rem 0;
    border: none;
    border-top: 1px solid #2d2f34;
}
[data-testid="stAlert"] {
    border-radius: 10px;
}
[data-testid="stSidebarNav"] ul li a {
    border-radius: 8px;
    margin-bottom: 2px;
    transition: all 0.15s ease;
}
[data-testid="stSidebarNav"] ul li a:hover {
    background-color: rgba(46, 204, 113, 0.12);
}
[data-testid="stSidebarNav"] span[data-testid="stSidebarNavHeader"] {
    font-weight: 700;
    color: #9aa0a6;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    margin-top: 12px;
    padding-left: 8px;
}
@media (max-width: 640px) {
    .main-title, div[style*="font-size: 2.2rem"] {
        font-size: 1.5rem !important;
    }
    [data-testid="stMetric"] {
        padding: 10px 12px !important;
    }
    [data-testid="stMetricLabel"] {
        font-size: 0.72rem !important;
    }
    [data-testid="stMetricValue"] {
        font-size: 1.05rem !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
    }
    [data-testid="column"] {
        min-width: 48% !important;
        flex: 1 1 48% !important;
    }
    [data-testid="stMetricValue"] > div {
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
    }
}
</style>
""", unsafe_allow_html=True)


def dados_iniciais():
    return {
        "lancamentos": [],
        "categorias": CATEGORIAS_PADRAO.copy(),
        "orcamentos": {},
        "acertos": [],
        "rendas": {},
        "dividas": [],
        "financiamentos": [],
        "metas": {},
    }

# ======================= HELPERS =======================
def fmt_moeda(v):
    # Verifica se o modo privacidade está ativado
    if "mostrar_valores" in st.session_state and not st.session_state["mostrar_valores"]:
        return "R$ •••••"

    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def somar_meses(data_base, meses):
    mes = data_base.month - 1 + meses
    ano = data_base.year + mes // 12
    mes = mes % 12 + 1
    return date(ano, mes, 1)


def calcular_parcelas(valor_total, n_parcelas):
    valor_centavos = round(valor_total * 100)
    base = valor_centavos // n_parcelas
    resto = valor_centavos - (base * n_parcelas)
    parcelas = [base / 100.0] * n_parcelas
    parcelas[-1] = (base + resto) / 100.0
    return parcelas


def carregar_dados():
    referencia = db.collection("controle_custos").document("dados")
    snapshot = referencia.get()
    dados = snapshot.to_dict() if snapshot.exists else None
    if not dados:
        dados = dados_iniciais()
    dados.setdefault("lancamentos", [])
    dados.setdefault("categorias", CATEGORIAS_PADRAO.copy())
    dados.setdefault("orcamentos", {})
    dados.setdefault("acertos", [])
    dados.setdefault("rendas", {})
    dados.setdefault("dividas", [])
    dados.setdefault("financiamentos", [])
    dados.setdefault("metas", {})

    for l in dados["lancamentos"]:
        l.setdefault("pessoa", "Não informado")
        l.setdefault("eh_parcela", False)
        l.setdefault("mes_referencia", l.get("data", "")[:7])
        l.setdefault("pagador", l.get("pessoa", "Não informado"))
        l.setdefault("classificacao", "Essencial")
        l.setdefault("antecipado", False)
        l.setdefault("antecipado_por", None)
    return dados


def salvar_dados(dados):
    try:
        db.collection("controle_custos").document("dados").set(dados)
        return True
    except Exception as e:
        st.error(f"Erro ao salvar no Firestore: {e}")
        return False


def lancamentos_df(dados):
    cols = ["id","data","tipo","valor","categoria","descricao","forma_pagamento",
            "pessoa","eh_parcela","mes_referencia","pagador","classificacao",
            "antecipado","antecipado_por"]
    if not dados["lancamentos"]:
        return pd.DataFrame(columns=cols)
    df = pd.DataFrame(dados["lancamentos"])
    df["data"] = pd.to_datetime(df["data"]).dt.date
    df["valor"] = df["valor"].astype(float)
    df["pessoa"] = df.get("pessoa", "Não informado").fillna("Não informado")
    df["eh_parcela"] = df.get("eh_parcela", False).fillna(False).astype(bool)
    df["mes_referencia"] = df.get("mes_referencia",
                                  df["data"].apply(lambda d: d.strftime("%Y-%m")))
    df["pagador"] = df.get("pagador", df["pessoa"]).fillna(df["pessoa"])
    df["classificacao"] = df.get("classificacao", "Essencial").fillna("Essencial")
    df["antecipado"] = df.get("antecipado", False).fillna(False).astype(bool)
    return df.sort_values("data", ascending=False).reset_index(drop=True)


def mes_ref_de(row):
    if row.get("mes_referencia"):
        return row["mes_referencia"]
    d = row.get("data")
    return d.strftime("%Y-%m") if d else ""


def get_renda(dados, mes, pessoa):
    return float(dados["rendas"].get(mes, {}).get(pessoa, 0.0))


def get_meta(dados, mes):
    return float(dados["metas"].get(mes, {}).get("despesa_total", 0.0))


def badge(texto, cor="verde"):
    """Retorna HTML de um badge colorido para tema escuro."""
    cores = {
        "verde":    ("rgba(126, 231, 135, 0.15)", "#7ee787"),
        "amarelo":  ("rgba(240, 180, 41, 0.15)", "#f0b429"),
        "vermelho": ("rgba(249, 128, 128, 0.15)", "#f98080"),
        "azul":     ("rgba(121, 192, 255, 0.15)", "#79c0ff"),
        "cinza":    ("rgba(176, 179, 184, 0.15)", "#b0b3b8"),
    }
    bg, fg = cores.get(cor, cores["cinza"])
    return (f'<span style="background:{bg};color:{fg};padding:2px 10px;'
            f'border-radius:12px;font-size:0.75rem;font-weight:600;">{texto}</span>')


def cabecalho_aba(icone, titulo, descricao):
    """Renderiza um cabeçalho padronizado para cada aba (tema escuro)."""
    st.markdown(f"""
    <div style="
        background: linear-gradient(135deg, rgba(46,204,113,0.08), rgba(46,204,113,0.02));
        padding: 16px 20px;
        border-radius: 12px;
        border-left: 4px solid #2ecc71;
        margin-bottom: 16px;
    ">
        <div style="font-size: 1.3rem; font-weight: 600; color: #e8eaed;">
            {icone} {titulo}
        </div>
        <div style="color: #9aa0a6; font-size: 0.9rem; margin-top: 4px;">
            {descricao}
        </div>
    </div>
    """, unsafe_allow_html=True)


# ==================== CÁLCULO DE ACERTO ====================
def calcular_acerto(df_periodo, divisao_conjunta=0.5):
    df_desp = df_periodo[df_periodo["tipo"] == "despesa"].copy()
    pago = {"Jeany": 0.0, "Rafael": 0.0}
    consumido = {"Jeany": 0.0, "Rafael": 0.0}

    for _, row in df_desp.iterrows():
        valor = float(row["valor"])
        pagador = row.get("pagador")
        dono = row.get("pessoa", "Não informado")

        # --- Quem pagou ---
        # Se o pagador não for um dos dois, assume que foi gasto conjunto
        # e distribui o "pago" proporcionalmente ao consumo (evita saldo fantasma).
        if pagador in pago:
            pago[pagador] += valor
        else:
            # Pagador desconhecido → divide o "pago" 50/50 pra não sumir com dinheiro
            pago["Jeany"] += valor * divisao_conjunta
            pago["Rafael"] += valor * (1 - divisao_conjunta)

        # --- Quem consumiu ---
        if dono == "Jeany e Rafael":
            consumido["Jeany"] += valor * divisao_conjunta
            consumido["Rafael"] += valor * (1 - divisao_conjunta)
        elif dono in consumido:
            consumido[dono] += valor
        else:
            # Pessoa desconhecida → trata como conjunto
            consumido["Jeany"] += valor * divisao_conjunta
            consumido["Rafael"] += valor * (1 - divisao_conjunta)

    saldo = {p: pago[p] - consumido[p] for p in pago}
    return {"pago": pago, "consumido": consumido, "saldo": saldo}

# ======================= SESSÃO / ESTADO GLOBAL =======================
if "dados" not in st.session_state:
    try:
        st.session_state.dados = carregar_dados()
    except Exception as e:
        st.error(f"Erro ao carregar dados do Firestore: {e}")
        st.stop()

dados = st.session_state.dados

# 🆕 Mês de referência global (padrão: próximo mês)
if "mes_referencia_global" not in st.session_state:
    st.session_state.mes_referencia_global = somar_meses(date.today(), 1).strftime("%Y-%m")


# ======================= PÁGINAS =======================
def render_novo():
    cabecalho_aba("➕", "Novo Lançamento",
                  "Registre despesas e receitas. Compras no crédito podem ser parceladas.")

    # ==================== Reconhecimento de Nota Fiscal (OCR) ====================
    with st.expander("📷 Escanear Nota Fiscal (opcional)", expanded=False):
        foto = st.file_uploader(
            "Tire uma foto ou envie uma imagem da nota fiscal",
            type=["jpg", "jpeg", "png"],
            key="nota_fiscal_foto",
            help="Após o upload, valor, data e descrição serão preenchidos automaticamente. A imagem não é salva."
        )

        if foto is not None:
            with st.spinner("🔍 Identificando informações da nota fiscal..."):
                try:
                    img_bytes = foto.getvalue()

                    from google import genai
                    from google.genai.types import Part

                    client = genai.Client(api_key=st.secrets["GEMINI_API_KEY"])

                    prompt = """Analise esta nota fiscal/cupom brasileiro e extraia as informações em JSON:
{
    "valor_total": número (float, apenas o valor total final),
    "data": "YYYY-MM-DD",
    "descricao": "nome do estabelecimento ou descrição curta",
    "categoria": "escolha uma de: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Compras, Contas, Outros"
}
Se algum campo não for legível, use null. Retorne APENAS o JSON, sem texto adicional."""

                    resposta = client.models.generate_content(
                        model="gemini-3.8-flash",
                        contents=[
                            Part.from_bytes(data=img_bytes, mime_type=foto.type or "image/jpeg"),
                            prompt
                        ]
                    )

                    texto = resposta.text.strip()
                    if texto.startswith("```"):
                        texto = texto.split("```")[1]
                        if texto.startswith("json"):
                            texto = texto[4:]
                    extraido = json.loads(texto.strip())

                    st.session_state["_nota_valor"] = extraido.get("valor_total")
                    st.session_state["_nota_data"] = extraido.get("data")
                    st.session_state["_nota_descricao"] = extraido.get("descricao")
                    st.session_state["_nota_categoria"] = extraido.get("categoria")
                    # 🔑 LIMPA as chaves dos widgets para forçar o preenchimento
                    for chave in ["novo_valor", "novo_valor_total", "novo_data",
                        "novo_descricao", "novo_categoria"]:
                        st.session_state.pop(chave, None)

                    st.success(
                        f"✅ Identificado: {extraido.get('descricao') or '—'} | "
                        f"R$ {extraido.get('valor_total') or 0:.2f} | "
                        f"{extraido.get('data') or '—'}"
                    )
                    st.caption("A imagem foi descartada e não será salva. Confira os campos abaixo antes de salvar.")

                except json.JSONDecodeError:
                    st.error("Não foi possível interpretar a resposta. Preencha manualmente.")
                except Exception as e:
                    st.error(f"Falha no reconhecimento: {e}")
    # =========================================================================

    col1, col2 = st.columns(2)
    with col1:
        tipo = st.radio("Tipo", ["Despesa", "Receita"], horizontal=True, key="novo_tipo")

    # 📅 Data: usa a data da nota se o OCR extraiu
    data_padrao = date.today()
    if st.session_state.get("_nota_data"):
        try:
            data_padrao = datetime.strptime(st.session_state["_nota_data"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass
    with col2:
        data_lanc = st.date_input("Data", value=data_padrao, key="novo_data")

    if tipo == "Despesa":
        forma = st.selectbox("Forma de pagamento", FORMAS_PAGAMENTO, key="novo_forma")
    else:
        forma = "—"

    eh_credito = (forma == "Crédito")
    parcelada = False
    if eh_credito:
        parcelada = st.checkbox("💳 Compra parcelada no cartão?", key="novo_parcelada")

    col3, col4, col5 = st.columns(3)
    with col3:
        if parcelada:
            valor_input = st.number_input("Valor TOTAL da compra (R$)", min_value=0.0,
                                          step=0.01, format="%.2f", key="novo_valor_total")
        else:
            # 💰 Valor: usa o valor da nota se o OCR extraiu
            valor_padrao = float(st.session_state.get("_nota_valor") or 0.0)
            valor_input = st.number_input("Valor (R$)", min_value=0.0, step=0.01,
                                          format="%.2f", value=valor_padrao, key="novo_valor")
    with col4:
        # 🏷️ Categoria: usa a categoria sugerida se existir na lista
        cat_sugerida = st.session_state.get("_nota_categoria")
        if cat_sugerida and cat_sugerida in dados["categorias"]:
            idx_cat = dados["categorias"].index(cat_sugerida)
        else:
            idx_cat = 0
        categoria = st.selectbox("Categoria", dados["categorias"],
                                 index=idx_cat, key="novo_categoria")
    with col5:
        pessoa = st.selectbox("Para quem é o gasto", PESSOAS, key="novo_pessoa")

    classificacao = st.radio(
        "Classificação", CLASSIFICACOES, horizontal=True,
        help="Essencial: gastos fixos e necessários. Não Essencial: lazer, extras, etc.",
        key="novo_classificacao"
    )

    if tipo == "Despesa":
        pagador = st.selectbox(
            "Quem pagou (desembolsou o dinheiro)", ["Jeany", "Rafael"],
            help="Pode ser diferente de 'para quem é o gasto'.",
            key="novo_pagador"
        )
    else:
        pagador = pessoa

    mes_referencia_escolhido = None
    n_parcelas = 1
    parcela_inicial = 1
    mes_primeira = None

    if eh_credito and parcelada:
        colp1, colp2 = st.columns(2)
        with colp1:
            n_parcelas = st.number_input("Total de parcelas da compra",
                                         min_value=2, max_value=48, value=2, step=1,
                                         key="novo_n_parcelas")
        with colp2:
            parcela_inicial = st.number_input(
                "A partir da parcela nº",
                min_value=1, max_value=int(n_parcelas), value=1, step=1,
                help="Use 1 se está começando agora. Use 5, por exemplo, se já pagou 4.",
                key="novo_parcela_inicial"
            )
        mes_padrao = somar_meses(data_lanc, 1)
        mes_primeira = st.date_input("Mês da 1ª parcela a registrar",
                                     value=mes_padrao.replace(day=1),
                                     key="novo_mes_primeira")
        if valor_input > 0 and n_parcelas >= 2 and parcela_inicial <= n_parcelas:
            todas = calcular_parcelas(valor_input, n_parcelas)
            restantes = todas[parcela_inicial - 1:]
            ultima_mes = somar_meses(mes_primeira, len(restantes) - 1)
            aviso = (
                f"💡 Serão criadas **{len(restantes)} parcela(s)** "
                f"(da **{parcela_inicial}ª** à **{n_parcelas}ª**), "
                f"de **{fmt_moeda(restantes[0])}**. "
                f"1ª em **{mes_primeira.strftime('%m/%Y')}**, "
                f"última em **{ultima_mes.strftime('%m/%Y')}**."
            )
            if restantes[0] != restantes[-1]:
                aviso += f" (última: {fmt_moeda(restantes[-1])})"
            st.info(aviso)

    elif eh_credito and not parcelada:
        mes_padrao = somar_meses(data_lanc, 1)
        mes_ref_input = st.date_input(
            "Fatura (mês de referência)",
            value=mes_padrao.replace(day=1),
            help="Compra no crédito pesa na fatura deste mês. Padrão: mês seguinte.",
            key="novo_mes_ref_input"
        )
        mes_referencia_escolhido = mes_ref_input.strftime("%Y-%m")
        st.info(
            f"💡 Esta compra de **{fmt_moeda(valor_input)}** vai pesar em "
            f"**{mes_ref_input.strftime('%m/%Y')}**."
        )

    # 📝 Descrição: usa o texto da nota se o OCR extraiu
    descricao = st.text_input(
        "Descrição",
        value=st.session_state.get("_nota_descricao") or "",
        placeholder="Ex: Notebook Dell",
        key="novo_descricao"
    )

    if st.button("💾 Salvar lançamento", type="primary", key="btn_salvar_novo"):
        if valor_input <= 0:
            st.warning("Informe um valor maior que zero.")
        elif parcelada and n_parcelas < 2:
            st.warning("Uma compra parcelada precisa ter ao menos 2 parcelas.")
        elif parcelada and parcela_inicial > n_parcelas:
            st.warning("A parcela inicial não pode ser maior que o total.")
        else:
            if parcelada:
                grupo_id = str(uuid.uuid4())
                todas_parcelas = calcular_parcelas(valor_input, n_parcelas)
                parcelas_a_criar = todas_parcelas[parcela_inicial - 1:]
                for idx, v in enumerate(parcelas_a_criar):
                    numero_parcela = parcela_inicial + idx
                    mes_ref = somar_meses(mes_primeira, idx).strftime("%Y-%m")
                    dados["lancamentos"].append({
                        "id": str(uuid.uuid4()),
                        "data": data_lanc.strftime("%Y-%m-%d"),
                        "tipo": "despesa",
                        "valor": float(v),
                        "categoria": categoria,
                        "classificacao": classificacao,
                        "descricao": descricao or "—",
                        "forma_pagamento": forma,
                        "pessoa": pessoa,
                        "pagador": pagador,
                        "parcela_atual": numero_parcela,
                        "total_parcelas": n_parcelas,
                        "grupo_parcela": grupo_id,
                        "valor_total": float(valor_input),
                        "mes_referencia": mes_ref,
                        "eh_parcela": True,
                        "antecipado": False,
                        "antecipado_por": None,
                    })
                if salvar_dados(dados):
                    for k in ["_nota_valor", "_nota_data", "_nota_descricao", "_nota_categoria"]:
                        st.session_state.pop(k, None)
                    st.success(f"✅ Compra parcelada salva! {len(parcelas_a_criar)} parcela(s).")
                    st.rerun()
            else:
                mes_ref_final = mes_referencia_escolhido if eh_credito else data_lanc.strftime("%Y-%m")
                dados["lancamentos"].append({
                    "id": str(uuid.uuid4()),
                    "data": data_lanc.strftime("%Y-%m-%d"),
                    "tipo": tipo.lower(),
                    "valor": float(valor_input),
                    "categoria": categoria,
                    "classificacao": classificacao,
                    "descricao": descricao or "—",
                    "forma_pagamento": forma,
                    "pessoa": pessoa,
                    "pagador": pagador,
                    "eh_parcela": False,
                    "mes_referencia": mes_ref_final,
                    "antecipado": False,
                    "antecipado_por": None,
                })
                if salvar_dados(dados):
                    for k in ["_nota_valor", "_nota_data", "_nota_descricao", "_nota_categoria"]:
                        st.session_state.pop(k, None)
                    st.success(f"✅ {tipo} de {fmt_moeda(valor_input)} salva!")
                    st.rerun()


def render_lista():
    cabecalho_aba("📋", "Lançamentos",
                  "Filtre, edite e exclua lançamentos. Compras parceladas ficam agrupadas.")

    df = lancamentos_df(dados)
    if df.empty:
        st.info("Nenhum lançamento ainda.")
        return

    col1, col2, col3, col4, col5, col6 = st.columns(6)
    with col1:
        mes_global = st.session_state.mes_referencia_global
        meses_disp = sorted(set(
            df["data"].apply(lambda d: d.strftime("%Y-%m")).tolist() +
            df["mes_referencia"].dropna().tolist() +
            [date.today().strftime("%Y-%m"), mes_global]
        ), reverse=True)
        opcoes = ["Todos"] + list(meses_disp)
        index_padrao = opcoes.index(mes_global) if mes_global in opcoes else 0
        mes_sel = st.selectbox("Mês de referência", options=opcoes, index=index_padrao,
                            format_func=lambda m: m if m == "Todos" else f"{m[5:]}/{m[:4]}",
                            key="lista_mes_sel")
    with col2:
        cat_sel = st.selectbox("Categoria", ["Todas"] + dados["categorias"],
                            key="lista_cat_sel")
    with col3:
        tipo_sel = st.selectbox("Tipo", ["Todos", "Despesa", "Receita"],
                                key="lista_tipo_sel")
    with col4:
        pessoa_sel = st.selectbox("Pessoa", ["Todas"] + PESSOAS + ["Não informado"],
                                key="lista_pessoa_sel")
    with col5:
        class_sel = st.selectbox("Classificação", ["Todas"] + CLASSIFICACOES,
                                key="lista_class_sel")
    with col6:
        forma_sel = st.selectbox("Forma de pagamento", ["Todas"] + FORMAS_PAGAMENTO,
                                key="lista_forma_sel")

    descricao_busca = st.text_input("🔍 Buscar na descrição",
                                    placeholder="Ex: mercado, notebook, uber...",
                                    key="filtro_descricao")

    df_f = df.copy()
    if mes_sel != "Todos":
        df_f = df_f[df_f.apply(lambda r: mes_ref_de(r) == mes_sel, axis=1)]
    if cat_sel != "Todas":
        df_f = df_f[df_f["categoria"] == cat_sel]
    if tipo_sel != "Todos":
        df_f = df_f[df_f["tipo"] == tipo_sel.lower()]
    if pessoa_sel != "Todas":
        df_f = df_f[df_f["pessoa"] == pessoa_sel]
    if class_sel != "Todas":
        df_f = df_f[df_f["classificacao"] == class_sel]
    if descricao_busca:
        df_f = df_f[df_f["descricao"].str.contains(descricao_busca, case=False, na=False)]
    if forma_sel != "Todas":
        df_f = df_f[df_f["forma_pagamento"] == forma_sel]

    total_desp = df_f[df_f["tipo"] == "despesa"]["valor"].sum()
    total_rec = df_f[df_f["tipo"] == "receita"]["valor"].sum()

    # 🆕 Cálculo de Essencial e Não Essencial (restaurado)
    ess = df_f[(df_f["tipo"] == "despesa") & (df_f["classificacao"] == "Essencial")]["valor"].sum()
    nao_ess = df_f[(df_f["tipo"] == "despesa") & (df_f["classificacao"] == "Não Essencial")]["valor"].sum()

    # 🆕 Correção do Saldo: Renda do Mês - Despesas
    mes_filtrado = st.session_state.get("lista_mes_sel", "Todos")
    if mes_filtrado == "Todos":
        # Se for "Todos", soma a renda de todos os meses que aparecem no filtro
        meses_unicos = df_f.apply(mes_ref_de, axis=1).unique()
        renda_mes_filtro = sum(
            get_renda(dados, m, "Jeany") + get_renda(dados, m, "Rafael")
            for m in meses_unicos
        )
    else:
        renda_mes_filtro = (
            get_renda(dados, mes_filtrado, "Jeany") +
            get_renda(dados, mes_filtrado, "Rafael")
        )

    saldo_correto = renda_mes_filtro - total_desp

    c1, c2, c3 = st.columns(3)
    c1.metric("Despesas", fmt_moeda(total_desp))
    c2.metric("Receitas", fmt_moeda(total_rec))
    c3.metric("Saldo", fmt_moeda(saldo_correto),
              help=f"Renda do período ({fmt_moeda(renda_mes_filtro)}) − Despesas ({fmt_moeda(total_desp)})")
    c4, c5 = st.columns(2)
    c4.metric("Essencial", fmt_moeda(ess))
    c5.metric("Não Essencial", fmt_moeda(nao_ess))

    st.divider()

    df_normais = df_f[~df_f["eh_parcela"]].copy()
    df_parcelas = df_f[df_f["eh_parcela"]].copy()

    for _, row in df_normais.iterrows():
        cols = st.columns([1.0, 0.9, 0.9, 1.0, 1.2, 0.9, 0.9, 0.8, 0.4, 0.4])
        cols[0].write(f"**{row['data'].strftime('%d/%m/%Y')}**")
        emoji = "🔴" if row["tipo"] == "despesa" else "🟢"
        cols[1].write(f"{emoji} {row['tipo'].capitalize()}")
        cols[2].write(fmt_moeda(row["valor"]))
        cols[3].write(row["categoria"])
        cols[4].write(row["descricao"][:25])
        cols[5].write(f"👤 {row['pessoa']}")
        cols[6].write(f"💳 {row.get('pagador', row['pessoa'])}")
        cor_badge = "verde" if row["classificacao"] == "Essencial" else "amarelo"
        cols[7].markdown(badge(row["classificacao"][:10], cor_badge), unsafe_allow_html=True)
        if cols[8].button("✏️", key=f"ed_{row['id']}"):
            st.session_state["edit_id"] = row["id"]
            st.rerun()
        if cols[9].button("🗑️", key=f"dl_{row['id']}"):
            dados["lancamentos"] = [l for l in dados["lancamentos"] if l["id"] != row["id"]]
            if salvar_dados(dados):
                st.success("Removido!")
                st.rerun()

    if not df_parcelas.empty:
        st.divider()
        st.caption("💳 Compras parceladas")
        grupos = df_parcelas.groupby("grupo_parcela")
        for grupo_id, g in grupos:
            g = g.sort_values("parcela_atual")
            primeira = g.iloc[0]
            ultima = g.iloc[-1]
            total_parcelas = int(primeira["total_parcelas"])
            valor_total = float(primeira.get("valor_total", g["valor"].sum()))
            num_inicial = int(primeira["parcela_atual"])
            num_final = int(ultima["parcela_atual"])
            faixa = (f"{num_inicial}/{total_parcelas}" if num_inicial == num_final
                     else f"{num_inicial}-{num_final}/{total_parcelas}")

            cols = st.columns([1.0, 0.9, 0.9, 1.0, 1.2, 0.9, 0.9, 0.8, 0.4, 0.4])
            cols[0].write(f"**{primeira['data'].strftime('%d/%m/%Y')}**")
            cols[1].write("💳 Parcelada")
            cols[2].write(f"**{fmt_moeda(valor_total)}**")
            cols[3].write(primeira["categoria"])
            cols[4].write(f"{primeira['descricao'][:22]} ({faixa})")
            cols[5].write(f"👤 {primeira['pessoa']}")
            cols[6].write(f"💳 {primeira.get('pagador', primeira['pessoa'])}")
            cor_badge = "verde" if primeira["classificacao"] == "Essencial" else "amarelo"
            cols[7].markdown(badge(primeira["classificacao"][:10], cor_badge), unsafe_allow_html=True)

            expandir_key = f"exp_{grupo_id}"
            if expandir_key not in st.session_state:
                st.session_state[expandir_key] = False
            if cols[8].button("▼" if not st.session_state[expandir_key] else "▲",
                              key=f"expbtn_{grupo_id}", help="Expandir parcelas"):
                st.session_state[expandir_key] = not st.session_state[expandir_key]
                st.rerun()
            if cols[9].button("🗑️", key=f"dlg_{grupo_id}", help="Excluir compra inteira"):
                dados["lancamentos"] = [l for l in dados["lancamentos"]
                                        if l.get("grupo_parcela") != grupo_id]
                if salvar_dados(dados):
                    st.success("Compra parcelada removida inteira.")
                    st.rerun()

            if st.session_state[expandir_key]:
                for _, p in g.iterrows():
                    cp = st.columns([1.0, 0.9, 0.9, 1.0, 1.2, 0.9, 0.9, 0.8, 0.4, 0.4])
                    cp[0].write(f"└ {p['parcela_atual']}/{int(p['total_parcelas'])}")
                    cp[1].write(f"📅 {p['mes_referencia']}")
                    cp[2].write(fmt_moeda(p["valor"]))
                    cp[3].write(p["categoria"])
                    cp[4].write("")
                    cp[5].write(f"👤 {p['pessoa']}")
                    cp[6].write(f"💳 {p.get('pagador', p['pessoa'])}")
                    ant = p.get("antecipado", False)
                    if ant:
                        cp[7].markdown(badge("✅ Antec.", "azul"), unsafe_allow_html=True)
                    else:
                        cp[7].write("—")
                    if cp[8].button("✏️", key=f"edp_{p['id']}"):
                        st.session_state["edit_id"] = p["id"]
                        st.rerun()
                    if cp[9].button("🗑️", key=f"dlp_{p['id']}"):
                        dados["lancamentos"] = [l for l in dados["lancamentos"] if l["id"] != p["id"]]
                        if salvar_dados(dados):
                            st.success("Parcela removida.")
                            st.rerun()

    if "edit_id" in st.session_state:
        edit_id = st.session_state["edit_id"]
        lanc = next((l for l in dados["lancamentos"] if l["id"] == edit_id), None)
        if lanc:
            st.divider()
            st.subheader("✏️ Editar lançamento")
            eh_parc = lanc.get("eh_parcela", False)
            with st.form(f"editar_{edit_id}"):
                e_data = st.date_input("Data",
                                       value=datetime.strptime(lanc["data"], "%Y-%m-%d").date(),
                                       key=f"edit_data_{edit_id}")
                e_tipo = st.selectbox("Tipo", ["Despesa", "Receita"],
                                      index=0 if lanc["tipo"] == "despesa" else 1,
                                      disabled=eh_parc, key=f"edit_tipo_{edit_id}")
                e_valor = st.number_input("Valor", value=float(lanc["valor"]),
                                          min_value=0.0, format="%.2f",
                                          key=f"edit_valor_{edit_id}")
                e_cat = st.selectbox("Categoria", dados["categorias"],
                                     index=dados["categorias"].index(lanc["categoria"])
                                     if lanc["categoria"] in dados["categorias"] else 0,
                                     key=f"edit_cat_{edit_id}")
                e_class = st.radio("Classificação", CLASSIFICACOES, horizontal=True,
                                   index=0 if lanc.get("classificacao", "Essencial") == "Essencial" else 1,
                                   key=f"edit_class_{edit_id}")
                e_pessoa_val = lanc.get("pessoa", "Não informado")
                opcoes_pessoa = PESSOAS + (["Não informado"] if e_pessoa_val == "Não informado" else [])
                e_pessoa = st.selectbox("Para quem é o gasto", opcoes_pessoa,
                                        index=opcoes_pessoa.index(e_pessoa_val)
                                        if e_pessoa_val in opcoes_pessoa else 0,
                                        key=f"edit_pessoa_{edit_id}")
                e_pagador_val = lanc.get("pagador", e_pessoa_val)
                e_pagador = st.selectbox("Quem pagou", ["Jeany", "Rafael"],
                                         index=["Jeany", "Rafael"].index(e_pagador_val)
                                         if e_pagador_val in ["Jeany", "Rafael"] else 0,
                                         key=f"edit_pagador_{edit_id}")
                e_desc = st.text_input("Descrição", value=lanc["descricao"],
                                       key=f"edit_desc_{edit_id}")
                e_forma = st.selectbox("Forma de pagamento", FORMAS_PAGAMENTO,
                       index=FORMAS_PAGAMENTO.index(lanc["forma_pagamento"])
                       if lanc["forma_pagamento"] in FORMAS_PAGAMENTO else 0,
                       key=f"edit_forma_{edit_id}")
                e_antecip = st.checkbox("Antecipado?", value=lanc.get("antecipado", False),
                                        key=f"edit_antecip_{edit_id}")

                # 🆕 Opção de aplicar a todas as parcelas
                aplicar_todas = False
                if eh_parc and lanc.get("grupo_parcela"):
                    aplicar_todas = st.checkbox(
                        "🔁 Aplicar alterações a TODAS as parcelas desta compra "
                        "(não altera valores, datas nem mês de referência de cada parcela)",
                        value=False,
                        key=f"edit_aplicar_todas_{edit_id}"
                    )
                e_antecip_por = None
                if e_antecip:
                    e_antecip_por = st.selectbox("Antecipado por", ["Jeany", "Rafael"],
                                                 key=f"edit_antecip_por_{edit_id}")
                permite_mes_ref = eh_parc or (lanc["forma_pagamento"] == "Crédito")
                e_mes_ref = None
                if permite_mes_ref:
                    e_mes_ref = st.text_input(
                        "Mês de referência (YYYY-MM)",
                        value=lanc.get("mes_referencia", lanc["data"][:7]),
                        key=f"edit_mes_ref_{edit_id}"
                    )

                c1, c2 = st.columns(2)
                if c1.form_submit_button("Salvar alterações", type="primary"):
                    campos_comuns = {
                        "categoria": e_cat,
                        "classificacao": e_class,
                        "descricao": e_desc,
                        "forma_pagamento": e_forma,
                        "pessoa": e_pessoa,
                        "pagador": e_pagador,
                        "antecipado": e_antecip,
                        "antecipado_por": e_antecip_por,
                    }
                    campos_individuais = {
                        "data": e_data.strftime("%Y-%m-%d"),
                        "tipo": e_tipo.lower(),
                        "valor": float(e_valor),
                    }

                    if aplicar_todas and lanc.get("grupo_parcela"):
                        grupo = lanc["grupo_parcela"]
                        for l in dados["lancamentos"]:
                            if l.get("grupo_parcela") == grupo:
                                l.update(campos_comuns)
                        # A parcela editada também recebe os campos individuais
                        lanc.update(campos_comuns)
                        lanc.update(campos_individuais)
                        if permite_mes_ref and e_mes_ref:
                            lanc["mes_referencia"] = e_mes_ref
                    else:
                        lanc.update(campos_comuns)
                        lanc.update(campos_individuais)
                        if permite_mes_ref and e_mes_ref:
                            lanc["mes_referencia"] = e_mes_ref

                    if salvar_dados(dados):
                        del st.session_state["edit_id"]
                        if aplicar_todas and lanc.get("grupo_parcela"):
                            st.success("✅ Alterações aplicadas a todas as parcelas!")
                        else:
                            st.success("Atualizado!")
                        st.rerun()
                if c2.form_submit_button("Cancelar"):
                    del st.session_state["edit_id"]
                    st.rerun()

    st.divider()
    csv = df_f.to_csv(index=False).encode("utf-8")
    st.download_button("⬇️ Exportar CSV", csv, "lancamentos.csv", "text/csv",
                       key="btn_export_csv")


def render_renda():
    cabecalho_aba("💰", "Renda Mensal",
                  "Cadastre a renda de cada pessoa por mês. Usada para calcular economia líquida.")

    mes_global = st.session_state.mes_referencia_global
    meses_renda = sorted(set(
        list(dados["rendas"].keys()) +
        [date.today().strftime("%Y-%m"), mes_global]
    ), reverse=True)

    col1, col2 = st.columns([2, 1])
    with col1:
        mes_renda = st.selectbox(
            "Mês de referência", options=meses_renda,
            index=meses_renda.index(mes_global) if mes_global in meses_renda else 0,
            format_func=lambda m: f"{m[5:]}/{m[:4]}", key="mes_renda")
    with col2:
        novo_mes = st.text_input("Adicionar novo mês (YYYY-MM)", placeholder="2026-11",
                                 key="novo_mes_renda")

    if novo_mes and len(novo_mes) == 7 and novo_mes[4] == "-":
        if novo_mes not in dados["rendas"]:
            dados["rendas"][novo_mes] = {"Jeany": 0.0, "Rafael": 0.0}
            if salvar_dados(dados):
                st.success(f"Mês {novo_mes} adicionado.")
                st.rerun()

    st.divider()

    if mes_renda not in dados["rendas"]:
        dados["rendas"][mes_renda] = {"Jeany": 0.0, "Rafael": 0.0}

    col_j, col_r = st.columns(2)
    with col_j:
        val_j = st.number_input(f"Renda Jeany em {mes_renda} (R$)",
                                min_value=0.0, step=50.0, format="%.2f",
                                value=float(dados["rendas"][mes_renda].get("Jeany", 0.0)),
                                key=f"renda_j_{mes_renda}")
    with col_r:
        val_r = st.number_input(f"Renda Rafael em {mes_renda} (R$)",
                                min_value=0.0, step=50.0, format="%.2f",
                                value=float(dados["rendas"][mes_renda].get("Rafael", 0.0)),
                                key=f"renda_r_{mes_renda}")

    if st.button("💾 Salvar renda", type="primary", key="btn_salvar_renda"):
        dados["rendas"][mes_renda] = {"Jeany": val_j, "Rafael": val_r}
        if salvar_dados(dados):
            st.success(f"Renda de {mes_renda} salva.")
            st.rerun()

    st.divider()
    st.write("**Histórico de rendas cadastradas:**")
    if dados["rendas"]:
        rendas_df = pd.DataFrame([
            {"Mês": k, "Jeany": fmt_moeda(v.get("Jeany", 0)),
             "Rafael": fmt_moeda(v.get("Rafael", 0)),
             "Total": fmt_moeda(v.get("Jeany", 0) + v.get("Rafael", 0))}
            for k, v in sorted(dados["rendas"].items(), reverse=True)
        ])
        st.dataframe(rendas_df, use_container_width=True, hide_index=True)


def render_categorias():
    cabecalho_aba("🏷️", "Categorias",
                  "Gerencie as categorias usadas para classificar os lançamentos.")

    with st.form("nova_cat"):
        c1, c2 = st.columns([3, 1])
        nova = c1.text_input("Nova categoria", placeholder="Ex: Pets", key="nova_cat_input")
        if c2.form_submit_button("➕ Adicionar", type="primary"):
            if nova and nova not in dados["categorias"]:
                dados["categorias"].append(nova)
                if salvar_dados(dados):
                    st.success(f"Categoria '{nova}' adicionada!")
                    st.rerun()
            elif nova in dados["categorias"]:
                st.warning("Essa categoria já existe.")

    st.divider()
    st.write("**Categorias existentes:**")
    for cat in dados["categorias"]:
        c1, c2 = st.columns([4, 1])
        c1.write(f"🏷️ {cat}")
        if c2.button("🗑️ Excluir", key=f"cat_{cat}"):
            dados["categorias"].remove(cat)
            dados["orcamentos"].pop(cat, None)
            if salvar_dados(dados):
                st.success(f"'{cat}' removida.")
                st.rerun()


def render_orcamentos():
    cabecalho_aba("🎯", "Orçamentos",
                  "Defina metas por categoria e acompanhe o quanto já gastou no mês.")

    df = lancamentos_df(dados)
    mes_global = st.session_state.mes_referencia_global
    meses_disponiveis = set()
    meses_disponiveis.add(date.today().strftime("%Y-%m"))
    meses_disponiveis.add(mes_global)
    if not df.empty:
        meses_disponiveis |= set(df["mes_referencia"].dropna().tolist())

    opcoes_orc = sorted(meses_disponiveis, reverse=True)
    index_orc_padrao = opcoes_orc.index(mes_global) if mes_global in opcoes_orc else 0

    mes_atual = st.selectbox("Mês de referência dos orçamentos", options=opcoes_orc,
                             index=index_orc_padrao,
                             format_func=lambda m: f"{m[5:]}/{m[:4]}",
                             key="orc_mes_sel")

    st.markdown("#### 🎯 Meta total de despesa")
    meta_atual = get_meta(dados, mes_atual)
    nova_meta = st.number_input(f"Meta de despesa total para {mes_atual} (R$)",
                                min_value=0.0, step=100.0, value=meta_atual,
                                format="%.2f", key=f"meta_{mes_atual}")
    if nova_meta != meta_atual:
        dados["metas"].setdefault(mes_atual, {})["despesa_total"] = nova_meta
        salvar_dados(dados)

    if not df.empty:
        df_mes = df[(df["tipo"] == "despesa") &
                    (df.apply(lambda r: mes_ref_de(r) == mes_atual, axis=1))].copy()
    else:
        df_mes = pd.DataFrame()

    if nova_meta > 0 and not df_mes.empty:
        gasto_total = df_mes["valor"].sum()
        pct = gasto_total / nova_meta
        restante = nova_meta - gasto_total
        cor = "🟢" if pct < 0.8 else ("🟡" if pct < 1.0 else "🔴")
        st.markdown(f"**{cor} Gasto total: {fmt_moeda(gasto_total)}** de {fmt_moeda(nova_meta)} — "
                    + (f"sobrou {fmt_moeda(restante)}" if restante >= 0
                       else f"excedeu {fmt_moeda(abs(restante))}"))
        st.progress(min(pct, 1.0))
    st.divider()

    for cat in dados["categorias"]:
        c1, c2, c3 = st.columns([2, 2, 3])
        c1.write(f"**{cat}**")
        valor_atual = float(dados["orcamentos"].get(cat, 0))
        novo_valor = c2.number_input(f"Limite {cat}", min_value=0.0, step=10.0,
                                     value=valor_atual, key=f"orc_{cat}",
                                     label_visibility="collapsed", format="%.2f")
        if novo_valor != valor_atual:
            dados["orcamentos"][cat] = novo_valor
            salvar_dados(dados)
        if novo_valor > 0 and not df_mes.empty:
            gasto = df_mes[df_mes["categoria"] == cat]["valor"].sum()
            pct = gasto / novo_valor
            cor = "🟢" if pct < 0.8 else ("🟡" if pct < 1.0 else "🔴")
            restante = novo_valor - gasto
            c3.markdown(f"**{cor} {fmt_moeda(gasto)}** — de {fmt_moeda(novo_valor)}")
            texto_barra = f"{pct*100:.0f}% — " + (
                f"sobrou {fmt_moeda(restante)}" if restante >= 0
                else f"excedeu {fmt_moeda(abs(restante))}")
            c3.progress(min(pct, 1.0), text=texto_barra)
        elif novo_valor == 0:
            c3.caption("Sem limite definido")


def render_acerto():
    cabecalho_aba("⚖️", "Acerto de Contas",
                  "Gastos conjuntos divididos 50/50. Veja quem deve transferir para quem.")

    df = lancamentos_df(dados)
    if df.empty:
        st.info("Nenhum lançamento para calcular.")
        return

    hoje = date.today()
    mes_global = st.session_state.mes_referencia_global

    periodo_acerto = st.selectbox(
        "Período do acerto",
        ["Próximo mês", "Este mês", "Mês passado", "Mês específico",
         "Últimos 3 meses", "Este ano", "Tudo"], key="periodo_acerto")

    mes_acerto_especifico = None
    if periodo_acerto == "Mês específico":
        meses_ac = sorted(set(
            df["data"].apply(lambda d: d.strftime("%Y-%m")).tolist() +
            df["mes_referencia"].dropna().tolist() +
            [mes_global]
        ), reverse=True)
        mes_acerto_especifico = st.selectbox("Escolha o mês", options=meses_ac,
                                             format_func=lambda m: f"{m[5:]}/{m[:4]}",
                                             key="mes_acerto")

    def filtrar_acerto(d):
        if periodo_acerto == "Próximo mês":
            return d[d.apply(lambda r: mes_ref_de(r) == mes_global, axis=1)]
        if periodo_acerto == "Este mês":
            return d[d.apply(lambda r: mes_ref_de(r) == hoje.strftime("%Y-%m"), axis=1)]
        if periodo_acerto == "Mês passado":
            primeiro = hoje.replace(day=1)
            ultimo_mes = primeiro - timedelta(days=1)
            return d[d.apply(lambda r: mes_ref_de(r) == ultimo_mes.strftime("%Y-%m"), axis=1)]
        if periodo_acerto == "Mês específico" and mes_acerto_especifico:
            return d[d.apply(lambda r: mes_ref_de(r) == mes_acerto_especifico, axis=1)]
        if periodo_acerto == "Últimos 3 meses":
            return d[d.apply(lambda r: mes_ref_de(r) >=
                             somar_meses(hoje, -3).strftime("%Y-%m"), axis=1)]
        if periodo_acerto == "Este ano":
            return d[d.apply(lambda r: mes_ref_de(r).startswith(str(hoje.year)), axis=1)]
        return d

    df_ac = filtrar_acerto(df)
    res = calcular_acerto(df_ac, divisao_conjunta=0.5)

    st.divider()
    c1, c2, c3 = st.columns(3)
    c1.metric("👤 Jeany pagou", fmt_moeda(res["pago"]["Jeany"]))
    c2.metric("👤 Rafael pagou", fmt_moeda(res["pago"]["Rafael"]))
    c3.metric("Total pago", fmt_moeda(res["pago"]["Jeany"] + res["pago"]["Rafael"]))
    c4, c5, c6 = st.columns(3)
    c4.metric("🧾 Jeany consumiu", fmt_moeda(res["consumido"]["Jeany"]))
    c5.metric("🧾 Rafael consumiu", fmt_moeda(res["consumido"]["Rafael"]))
    c6.metric("Total consumo", fmt_moeda(res["consumido"]["Jeany"] + res["consumido"]["Rafael"]))

    st.divider()
    st.subheader("💸 Resultado do acerto")
    saldo_j = res["saldo"]["Jeany"]
    saldo_r = res["saldo"]["Rafael"]

    colj, colr = st.columns(2)
    with colj:
        if saldo_j >= 0:
            st.success(f"**Jeany tem a receber**\n\n{fmt_moeda(saldo_j)}")
        else:
            st.error(f"**Jeany deve transferir**\n\n{fmt_moeda(abs(saldo_j))}")
    with colr:
        if saldo_r >= 0:
            st.success(f"**Rafael tem a receber**\n\n{fmt_moeda(saldo_r)}")
        else:
            st.error(f"**Rafael deve transferir**\n\n{fmt_moeda(abs(saldo_r))}")

    if abs(saldo_j) < 0.01:
        st.info("🎉 Tudo certo! Ninguém precisa transferir nada.")
    elif saldo_j > 0:
        st.markdown(f"### ➡️ **Rafael deve transferir {fmt_moeda(saldo_j)} para Jeany**")
    else:
        st.markdown(f"### ➡️ **Jeany deve transferir {fmt_moeda(abs(saldo_j))} para Rafael**")

    if abs(saldo_j) >= 0.01:
        devedor = "Rafael" if saldo_j > 0 else "Jeany"
        credor = "Jeany" if saldo_j > 0 else "Rafael"
        valor_acerto = abs(saldo_j)
        with st.expander("📝 Registrar este acerto no histórico"):
            mes_acerto_label = (mes_acerto_especifico if periodo_acerto == "Mês específico"
                                else (mes_global if periodo_acerto == "Próximo mês"
                                      else hoje.strftime("%Y-%m")))
            obs = st.text_input("Observação (opcional)", key="obs_acerto")
            if st.button("✅ Registrar acerto como Pendente", key="btn_reg_acerto"):
                dados["acertos"].append({
                    "id": str(uuid.uuid4()),
                    "mes": mes_acerto_label,
                    "devedor": devedor,
                    "credor": credor,
                    "valor": float(valor_acerto),
                    "status": "Pendente",
                    "data_registro": datetime.now().strftime("%Y-%m-%d"),
                    "data_pagamento": None,
                    "observacao": obs,
                })
                if salvar_dados(dados):
                    st.success("Acerto registrado no histórico!")
                    st.rerun()

    with st.expander("📋 Ver detalhamento por categoria e pessoa"):
        df_desp = df_ac[df_ac["tipo"] == "despesa"].copy()
        if not df_desp.empty:
            tabela = df_desp.groupby(["categoria", "pessoa", "pagador"]).agg(
                total=("valor", "sum"), qtd=("id", "count")
            ).reset_index().rename(columns={
                "categoria": "Categoria", "pessoa": "Para quem",
                "pagador": "Quem pagou", "total": "Total (R$)", "qtd": "Qtd"
            })
            tabela["Total (R$)"] = tabela["Total (R$)"].apply(fmt_moeda)
            st.dataframe(tabela, use_container_width=True, hide_index=True)
        else:
            st.info("Sem despesas no período.")


def render_acertos_pendentes():
    cabecalho_aba("✅", "Histórico de Acertos",
                  "Acompanhe as transferências pendentes e já realizadas entre Jeany e Rafael.")

    if not dados["acertos"]:
        st.info("Nenhum acerto registrado ainda.")
        return

    pendentes = [a for a in dados["acertos"] if a["status"] == "Pendente"]
    pagos = [a for a in dados["acertos"] if a["status"] == "Transferido"]

    c1, c2, c3 = st.columns(3)
    c1.metric("Pendentes", len(pendentes))
    c2.metric("Transferidos", len(pagos))
    total_pend = sum(a["valor"] for a in pendentes)
    c3.metric("Total pendente", fmt_moeda(total_pend))

    st.divider()
    st.markdown("### 💸 Pendentes")
    if not pendentes:
        st.success("🎉 Nenhum acerto pendente!")
    else:
        for a in sorted(pendentes, key=lambda x: x["data_registro"]):
            cols = st.columns([1.0, 1.0, 1.0, 1.0, 1.5, 0.8, 0.8])
            cols[0].write(f"**{a['mes']}**")
            cols[1].write(f"👤 {a['devedor']}")
            cols[2].write(f"➡️ {a['credor']}")
            cols[3].write(f"**{fmt_moeda(a['valor'])}**")
            cols[4].caption(f"Reg.: {a['data_registro']} | {a.get('observacao','') or '—'}")
            if cols[5].button("✅ Pago", key=f"pg_{a['id']}"):
                a["status"] = "Transferido"
                a["data_pagamento"] = date.today().strftime("%Y-%m-%d")
                if salvar_dados(dados):
                    st.success("Marcado como transferido!")
                    st.rerun()
            if cols[6].button("🗑️", key=f"del_ac_{a['id']}"):
                dados["acertos"] = [x for x in dados["acertos"] if x["id"] != a["id"]]
                if salvar_dados(dados):
                    st.rerun()

    st.divider()
    st.markdown("### 📜 Histórico de transferidos")
    if not pagos:
        st.caption("Nenhum acerto transferido ainda.")
    else:
        hist = pd.DataFrame([
            {"Mês": a["mes"], "De": a["devedor"], "Para": a["credor"],
             "Valor": fmt_moeda(a["valor"]),
             "Data pagamento": a.get("data_pagamento", "—")}
            for a in sorted(pagos, key=lambda x: x.get("data_pagamento") or "", reverse=True)
        ])
        st.dataframe(hist, use_container_width=True, hide_index=True)


def render_relatorios():
    cabecalho_aba("📊", "Relatórios",
                  "Análises por período, pessoa, categoria e classificação Essencial/Não Essencial.")

    df = lancamentos_df(dados)
    if df.empty:
        st.info("Nenhum dado para exibir ainda.")
        return

    hoje = date.today()
    mes_global = st.session_state.mes_referencia_global

    col_per, col_pes, col_class = st.columns([2, 1, 1])
    with col_per:
        periodo = st.selectbox("Período",
                               ["Próximo mês", "Mês específico", "Intervalo personalizado",
                                "Este mês", "Mês passado", "Últimos 3 meses",
                                "Últimos 6 meses", "Este ano", "Tudo"],
                               key="rel_periodo_sel")
    with col_pes:
        pessoa_filtro = st.selectbox("Pessoa (relatórios)",
                                     ["Todas"] + PESSOAS + ["Não informado"],
                                     key="rel_pessoa_sel")
    with col_class:
        class_filtro = st.selectbox("Classificação", ["Todas"] + CLASSIFICACOES,
                                    key="rel_class_sel")

    mes_especifico = None
    data_ini = None
    data_fim = None

    if periodo == "Mês específico":
        meses_com_dados = sorted(set(
            df["data"].apply(lambda d: d.strftime("%Y-%m")).tolist() +
            df["mes_referencia"].dropna().tolist() +
            [hoje.strftime("%Y-%m"), mes_global]
        ), reverse=True)
        index_padrao = meses_com_dados.index(mes_global) if mes_global in meses_com_dados else 0
        mes_especifico = st.selectbox("Escolha o mês", options=meses_com_dados,
                                      index=index_padrao,
                                      format_func=lambda m: f"{m[5:]}/{m[:4]}",
                                      key="rel_mes_esp_sel")
    elif periodo == "Intervalo personalizado":
        col_d1, col_d2 = st.columns(2)
        with col_d1:
            data_ini = st.date_input("Data inicial", value=hoje.replace(day=1),
                                     key="rel_data_ini")
        with col_d2:
            data_fim = st.date_input("Data final", value=hoje, key="rel_data_fim")
        if data_ini > data_fim:
            st.warning("A data inicial é maior que a final. Inverta os campos.")

    def filtrar(d):
        if periodo == "Próximo mês":
            return d[d.apply(lambda r: mes_ref_de(r) == mes_global, axis=1)]
        if periodo == "Este mês":
            return d[d.apply(lambda r: mes_ref_de(r) == hoje.strftime("%Y-%m"), axis=1)]
        if periodo == "Mês passado":
            primeiro = hoje.replace(day=1)
            ultimo_mes = primeiro - timedelta(days=1)
            return d[d.apply(lambda r: mes_ref_de(r) == ultimo_mes.strftime("%Y-%m"), axis=1)]
        if periodo == "Mês específico" and mes_especifico:
            return d[d.apply(lambda r: mes_ref_de(r) == mes_especifico, axis=1)]
        if periodo == "Intervalo personalizado" and data_ini and data_fim:
            ini_str = data_ini.strftime("%Y-%m")
            fim_str = data_fim.strftime("%Y-%m")
            return d[d.apply(lambda r: ini_str <= mes_ref_de(r) <= fim_str, axis=1)]
        if periodo == "Últimos 3 meses":
            return d[d.apply(lambda r: mes_ref_de(r) >=
                             somar_meses(hoje, -3).strftime("%Y-%m"), axis=1)]
        if periodo == "Últimos 6 meses":
            return d[d.apply(lambda r: mes_ref_de(r) >=
                             somar_meses(hoje, -6).strftime("%Y-%m"), axis=1)]
        if periodo == "Este ano":
            return d[d.apply(lambda r: mes_ref_de(r).startswith(str(hoje.year)), axis=1)]
        return d

    df_f = filtrar(df)
    if pessoa_filtro != "Todas":
        df_f = df_f[df_f["pessoa"] == pessoa_filtro]
    if class_filtro != "Todas":
        df_f = df_f[(df_f["classificacao"] == class_filtro) | (df_f["tipo"] == "receita")]

    desp = df_f[df_f["tipo"] == "despesa"]["valor"].sum()
    rec = df_f[df_f["tipo"] == "receita"]["valor"].sum()

    # 💰 Renda: soma todos os meses de referência presentes no filtro
    meses_no_filtro = set(df_f.apply(mes_ref_de, axis=1).dropna().unique())
    if not meses_no_filtro:
        # fallback: usa o mês global quando o filtro está vazio
        meses_no_filtro = {st.session_state.mes_referencia_global}

    renda_j = sum(get_renda(dados, m, "Jeany") for m in meses_no_filtro)
    renda_r = sum(get_renda(dados, m, "Rafael") for m in meses_no_filtro)
    renda = renda_j + renda_r

    # Se filtrou por pessoa, usa só a renda dela no saldo
    if pessoa_filtro == "Jeany":
        renda_para_saldo = renda_j
    elif pessoa_filtro == "Rafael":
        renda_para_saldo = renda_r
    else:
        renda_para_saldo = renda

    dias = max((df_f["data"].max() - df_f["data"].min()).days + 1, 1) if not df_f.empty else 1
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("💸 Despesas", fmt_moeda(desp))
    c2.metric("💰 Renda", fmt_moeda(renda),
              help=f"Jeany: {fmt_moeda(renda_j)} | Rafael: {fmt_moeda(renda_r)}")
    c3.metric("📊 Saldo", fmt_moeda(renda_para_saldo - desp),
              help=f"Renda ({fmt_moeda(renda_para_saldo)}) − Despesas ({fmt_moeda(desp)})")
    c4.metric("📅 Média diária", fmt_moeda(desp / dias))

    # 🪙 Receitas extras (caso você ainda queira ver separado)
    if rec > 0:
        st.caption(f"🪙 Receitas extras lançadas no período: **{fmt_moeda(rec)}** "
                   f"(não entram no saldo acima)")

    st.divider()
    st.subheader("💼 Renda x Despesa x Economia por pessoa")
    st.caption("Usa a renda cadastrada na aba 💰 Renda.")

    if periodo == "Mês específico" and mes_especifico:
        renda_j = get_renda(dados, mes_especifico, "Jeany")
        renda_r = get_renda(dados, mes_especifico, "Rafael")
    elif periodo == "Próximo mês":
        renda_j = get_renda(dados, mes_global, "Jeany")
        renda_r = get_renda(dados, mes_global, "Rafael")
    elif periodo == "Este mês":
        mes_alvo = hoje.strftime("%Y-%m")
        renda_j = get_renda(dados, mes_alvo, "Jeany")
        renda_r = get_renda(dados, mes_alvo, "Rafael")
    else:
        renda_j = renda_r = 0.0

    if renda_j > 0 or renda_r > 0:
        df_desp = df_f[df_f["tipo"] == "despesa"]
        desp_j = df_desp[df_desp["pagador"] == "Jeany"]["valor"].sum()
        desp_r = df_desp[df_desp["pagador"] == "Rafael"]["valor"].sum()
        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown("**👤 Jeany**")
            st.write(f"Renda: {fmt_moeda(renda_j)}")
            st.write(f"Despesas pagas: {fmt_moeda(desp_j)}")
            eco = renda_j - desp_j
            st.metric("Economia líquida", fmt_moeda(eco),
                      delta=f"{(eco/renda_j*100):.1f}%" if renda_j > 0 else None)
        with col_b:
            st.markdown("**👤 Rafael**")
            st.write(f"Renda: {fmt_moeda(renda_r)}")
            st.write(f"Despesas pagas: {fmt_moeda(desp_r)}")
            eco = renda_r - desp_r
            st.metric("Economia líquida", fmt_moeda(eco),
                      delta=f"{(eco/renda_r*100):.1f}%" if renda_r > 0 else None)
    else:
        st.info("Cadastre a renda mensal na aba 💰 Renda para ver a economia líquida.")

    st.divider()
    st.subheader("👥 Gastos por pessoa")
    df_desp_pessoa = df_f[df_f["tipo"] == "despesa"]
    if not df_desp_pessoa.empty:
        agg_pessoa = df_desp_pessoa.groupby("pessoa")["valor"].sum().reset_index()
        agg_pessoa = agg_pessoa.sort_values("valor", ascending=False)
        total_geral = agg_pessoa["valor"].sum()
        n_cols = min(len(agg_pessoa), 4)
        cols_p = st.columns(n_cols)
        for i, (_, r) in enumerate(agg_pessoa.iterrows()):
            pct = (r["valor"] / total_geral * 100) if total_geral > 0 else 0
            with cols_p[i % n_cols]:
                st.metric(f"👤 {r['pessoa']}", fmt_moeda(r["valor"]), f"{pct:.1f}%")

        col_p1, col_p2 = st.columns(2)
        with col_p1:
            fig = px.pie(agg_pessoa, values="valor", names="pessoa", hole=0.4,
                         title="Distribuição por pessoa")
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True, key="rel_pie_pessoa")
        with col_p2:
            agg_cat_pessoa = df_desp_pessoa.groupby(["categoria", "pessoa"])["valor"].sum().reset_index()
            fig = px.bar(agg_cat_pessoa, x="categoria", y="valor", color="pessoa",
                         barmode="stack",
                         labels={"categoria": "Categoria", "valor": "R$", "pessoa": "Pessoa"},
                         title="Gastos por categoria e pessoa")
            fig.update_traces(texttemplate='R$ %{y:,.2f}', textposition='inside')
            st.plotly_chart(fig, use_container_width=True, key="rel_bar_cat_pessoa")
    else:
        st.info("Sem despesas no período.")

    st.divider()
    st.subheader("🎨 Essencial vs Não Essencial")
    df_desp_class = df_f[df_f["tipo"] == "despesa"]
    if not df_desp_class.empty:
        agg_class = df_desp_class.groupby("classificacao")["valor"].sum().reset_index()
        col_e1, col_e2 = st.columns(2)
        with col_e1:
            fig = px.pie(agg_class, values="valor", names="classificacao", hole=0.4,
                         title="Distribuição por classificação", color="classificacao",
                         color_discrete_map={"Essencial": "#2ecc71", "Não Essencial": "#e67e22"})
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True, key="rel_pie_class")
        with col_e2:
            df_cat_class = df_desp_class.groupby(["categoria", "classificacao"])["valor"].sum().reset_index()
            fig = px.bar(df_cat_class, x="categoria", y="valor", color="classificacao",
                         barmode="stack", title="Categorias por classificação",
                         color_discrete_map={"Essencial": "#2ecc71", "Não Essencial": "#e67e22"})
            st.plotly_chart(fig, use_container_width=True, key="rel_bar_class")

    st.divider()
    st.subheader("📅 Evolução mensal por pessoa")
    df_desp2 = df_f[df_f["tipo"] == "despesa"].copy()
    if not df_desp2.empty:
        df_desp2["mes"] = df_desp2.apply(mes_ref_de, axis=1)
        agg_mes_pessoa = df_desp2.groupby(["mes", "pessoa"])["valor"].sum().reset_index()
        fig = px.bar(agg_mes_pessoa, x="mes", y="valor", color="pessoa",
                     barmode="group",
                     labels={"mes": "Mês", "valor": "R$", "pessoa": "Pessoa"},
                     title="Despesas mensais por pessoa")
        fig.update_traces(texttemplate='R$ %{y:,.2f}', textposition='outside')
        st.plotly_chart(fig, use_container_width=True, key="rel_bar_evol_pessoa")

    st.divider()
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Gastos por categoria")
        df_desp = df_f[df_f["tipo"] == "despesa"]
        if not df_desp.empty:
            agg = df_desp.groupby("categoria")["valor"].sum().reset_index()
            fig = px.pie(agg, values="valor", names="categoria", hole=0.4,
                         title="Distribuição das despesas")
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True, key="rel_pie_cat")
        with col2:
            st.subheader("Renda vs Despesas por mês")

            # Despesas por mês
            df_f2 = df_f.copy()
            df_f2["mes"] = df_f2.apply(mes_ref_de, axis=1)
            agrup_desp = (df_f2[df_f2["tipo"] == "despesa"]
                        .groupby("mes")["valor"].sum()
                        .reset_index()
                        .rename(columns={"valor": "Despesas"}))

            # Renda por mês (das rendas cadastradas)
            meses_graf = sorted(df_f2["mes"].dropna().unique())
            rendas_rows = []
            for m in meses_graf:
                rendas_rows.append({
                    "mes": m,
                    "Renda": get_renda(dados, m, "Jeany") + get_renda(dados, m, "Rafael")
                })
            agrup_renda = pd.DataFrame(rendas_rows)

            # Junta os dois
            agrup = pd.merge(agrup_desp, agrup_renda, on="mes", how="outer").fillna(0)
            agrup = agrup.melt(id_vars="mes", value_vars=["Renda", "Despesas"],
                            var_name="Tipo", value_name="valor")

            if not agrup.empty:
                fig = px.bar(agrup, x="mes", y="valor", color="Tipo", barmode="group",
                            labels={"mes": "Mês", "valor": "R$", "Tipo": "Tipo"},
                            color_discrete_map={"Despesas": "#e74c3c", "Renda": "#2ecc71"})
                st.plotly_chart(fig, use_container_width=True, key="rel_bar_renda_desp")

    st.divider()
    st.subheader("Evolução de gastos (acumulado por mês)")
    df_g = df_f[df_f["tipo"] == "despesa"].copy()
    if not df_g.empty:
        df_g["mes"] = df_g.apply(mes_ref_de, axis=1)
        agg_mes = df_g.groupby("mes")["valor"].sum().reset_index().sort_values("mes")
        agg_mes["acumulado"] = agg_mes["valor"].cumsum()
        fig = go.Figure()
        fig.add_trace(go.Bar(x=agg_mes["mes"], y=agg_mes["valor"], name="Gasto do mês",
                             text=agg_mes["valor"].apply(lambda v: f"R$ {v:,.2f}"),
                             textposition="outside", marker_color="#e74c3c"))
        fig.add_trace(go.Scatter(x=agg_mes["mes"], y=agg_mes["acumulado"], name="Acumulado",
                                 mode="lines+markers+text",
                                 text=agg_mes["acumulado"].apply(lambda v: f"R$ {v:,.2f}"),
                                 textposition="top center",
                                 line=dict(color="#2c3e50", width=3)))
        fig.update_layout(xaxis_title="Mês", yaxis_title="R$", hovermode="x unified")
        st.plotly_chart(fig, use_container_width=True, key="rel_bar_acumulado")


def render_projecao():
    cabecalho_aba("📈", "Projeção de Parcelas",
                  "Veja quanto já está comprometido nos próximos meses por causa de compras parceladas.")

    df = lancamentos_df(dados)
    if df.empty:
        st.info("Sem dados para projetar.")
        return

    hoje = date.today()
    meses_futuros = st.slider("Meses para projetar", 3, 24, 12, key="proj_meses_slider")
    parcelas = df[df["eh_parcela"]].copy()
    if parcelas.empty:
        st.info("Nenhuma compra parcelada registrada.")
        return

    meses_ref = [somar_meses(hoje, i).strftime("%Y-%m") for i in range(meses_futuros)]
    dados_proj = []
    for m in meses_ref:
        sub = parcelas[parcelas["mes_referencia"] == m]
        dados_proj.append({
            "Mês": m, "Total": sub["valor"].sum(),
            "Jeany": sub[sub["pagador"] == "Jeany"]["valor"].sum(),
            "Rafael": sub[sub["pagador"] == "Rafael"]["valor"].sum()
        })

    df_proj = pd.DataFrame(dados_proj)
    df_show = df_proj.copy()
    df_show["Mês"] = df_show["Mês"].apply(lambda m: f"{m[5:]}/{m[:4]}")
    df_show["Total"] = df_show["Total"].apply(fmt_moeda)
    df_show["Jeany"] = df_show["Jeany"].apply(fmt_moeda)
    df_show["Rafael"] = df_show["Rafael"].apply(fmt_moeda)
    st.dataframe(df_show, use_container_width=True, hide_index=True)

    fig = px.bar(df_proj, x="Mês", y=["Jeany", "Rafael"], barmode="stack",
                 title=f"Comprometimento futuro ({meses_futuros} meses)")
    fig.update_layout(yaxis_title="R$")
    st.plotly_chart(fig, use_container_width=True, key="proj_bar")

    st.metric("Total comprometido no período", fmt_moeda(df_proj["Total"].sum()))


def render_financiamentos():
    cabecalho_aba("🏦", "Financiamentos",
                  "Cadastre financiamentos e acompanhe o saldo devedor e progresso de quitação.")

    with st.form("novo_fin"):
        c1, c2 = st.columns(2)
        with c1:
            fin_desc = st.text_input("Descrição", placeholder="Ex: Apartamento",
                                     key="fin_desc_input")
            fin_valor_total = st.number_input("Valor financiado (R$)", min_value=0.0,
                                              step=1000.0, format="%.2f",
                                              key="fin_valor_total_input")
            fin_parcela = st.number_input("Valor da parcela (R$)", min_value=0.0,
                                          step=10.0, format="%.2f",
                                          key="fin_parcela_input")
        with c2:
            fin_prazo = st.number_input("Prazo total (meses)", min_value=1, value=360,
                                        step=1, key="fin_prazo_input")
            fin_pagas = st.number_input("Parcelas já pagas", min_value=0, value=0,
                                        step=1, key="fin_pagas_input")
            fin_pessoa = st.selectbox("Responsável", PESSOAS, key="fin_pessoa_input")
        if st.form_submit_button("➕ Adicionar financiamento", type="primary"):
            if fin_desc and fin_valor_total > 0:
                dados["financiamentos"].append({
                    "id": str(uuid.uuid4()),
                    "descricao": fin_desc,
                    "valor_total": float(fin_valor_total),
                    "valor_parcela": float(fin_parcela),
                    "prazo": int(fin_prazo),
                    "pagas": int(fin_pagas),
                    "pessoa": fin_pessoa,
                })
                if salvar_dados(dados):
                    st.success("Financiamento adicionado!")
                    st.rerun()

    st.divider()
    if not dados["financiamentos"]:
        st.info("Nenhum financiamento cadastrado.")
        return

    for f in dados["financiamentos"]:
        restantes = f["prazo"] - f["pagas"]
        pago = f["valor_parcela"] * f["pagas"]
        saldo = f["valor_parcela"] * restantes
        pct = f["pagas"] / f["prazo"] if f["prazo"] > 0 else 0
        with st.expander(f"🏠 {f['descricao']} — {f['pessoa']}"):
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Parcelas pagas", f"{f['pagas']}/{f['prazo']}")
            c2.metric("Total pago", fmt_moeda(pago))
            c3.metric("Saldo restante", fmt_moeda(saldo))
            c4.metric("Parcela mensal", fmt_moeda(f["valor_parcela"]))
            st.progress(min(pct, 1.0), text=f"{pct*100:.1f}% quitado")
            cc1, cc2 = st.columns(2)
            nova_pagas = cc1.number_input("Atualizar parcelas pagas",
                                          min_value=0, max_value=f["prazo"],
                                          value=f["pagas"], key=f"pag_{f['id']}")
            if nova_pagas != f["pagas"]:
                f["pagas"] = int(nova_pagas)
                salvar_dados(dados)
                st.rerun()
            if cc2.button("🗑️ Excluir", key=f"delf_{f['id']}"):
                dados["financiamentos"] = [x for x in dados["financiamentos"] if x["id"] != f["id"]]
                if salvar_dados(dados):
                    st.rerun()


def render_dividas():
    cabecalho_aba("👥", "Dívidas a Terceiros",
                  "Registre empréstimos feitos a outras pessoas e acompanhe o recebimento.")

    with st.form("nova_divida"):
        c1, c2, c3 = st.columns(3)
        with c1:
            d_pessoa = st.text_input("Pessoa/Devedor", placeholder="Ex: Ione e Kelly",
                                     key="div_pessoa_input")
            d_valor_total = st.number_input("Valor total (R$)", min_value=0.0,
                                            step=10.0, format="%.2f",
                                            key="div_valor_total_input")
        with c2:
            d_parcela = st.number_input("Valor da parcela (R$)", min_value=0.0,
                                        step=10.0, format="%.2f",
                                        key="div_parcela_input")
            d_prazo = st.number_input("Nº de parcelas", min_value=1, value=12, step=1,
                                      key="div_prazo_input")
        with c3:
            d_recebidas = st.number_input("Parcelas já recebidas", min_value=0, value=0,
                                          step=1, key="div_recebidas_input")
            d_obs = st.text_input("Observação", key="div_obs_input")
        if st.form_submit_button("➕ Adicionar dívida", type="primary"):
            if d_pessoa and d_valor_total > 0:
                dados["dividas"].append({
                    "id": str(uuid.uuid4()),
                    "pessoa": d_pessoa,
                    "valor_total": float(d_valor_total),
                    "valor_parcela": float(d_parcela),
                    "prazo": int(d_prazo),
                    "recebidas": int(d_recebidas),
                    "observacao": d_obs,
                })
                if salvar_dados(dados):
                    st.success("Dívida adicionada!")
                    st.rerun()

    st.divider()
    if not dados["dividas"]:
        st.info("Nenhuma dívida registrada.")
        return

    for d in dados["dividas"]:
        restantes = d["prazo"] - d["recebidas"]
        recebido = d["valor_parcela"] * d["recebidas"]
        a_receber = d["valor_parcela"] * restantes
        pct = d["recebidas"] / d["prazo"] if d["prazo"] > 0 else 0
        with st.expander(f"👤 {d['pessoa']} — {d['prazo']}x de {fmt_moeda(d['valor_parcela'])}"):
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Parcelas recebidas", f"{d['recebidas']}/{d['prazo']}")
            c2.metric("Total recebido", fmt_moeda(recebido))
            c3.metric("A receber", fmt_moeda(a_receber))
            c4.metric("Valor total", fmt_moeda(d["valor_total"]))
            st.progress(min(pct, 1.0), text=f"{pct*100:.1f}% recebido")
            if d.get("observacao"):
                st.caption(f"📝 {d['observacao']}")
            cc1, cc2 = st.columns(2)
            nova_rec = cc1.number_input("Atualizar parcelas recebidas",
                                        min_value=0, max_value=d["prazo"],
                                        value=d["recebidas"], key=f"rec_{d['id']}")
            if nova_rec != d["recebidas"]:
                d["recebidas"] = int(nova_rec)
                salvar_dados(dados)
                st.rerun()
            if cc2.button("🗑️ Excluir", key=f"deld_{d['id']}"):
                dados["dividas"] = [x for x in dados["dividas"] if x["id"] != d["id"]]
                if salvar_dados(dados):
                    st.rerun()


def render_importar():
    cabecalho_aba("⚙️", "Importar Excel",
                  "Importe a aba 'Lançamentos_Gastos_Cartão' do Excel. "
                  "Linhas com 'Número de Parcelas' > 1 viram compras parceladas.")

    arquivo = st.file_uploader("Selecione o arquivo .xlsx", type=["xlsx"],
                               key="import_file_uploader")
    if not arquivo:
        return

    try:
        df_imp = pd.read_excel(arquivo, sheet_name="Lançamentos_Gastos_Cartão")
        st.write("**Prévia dos dados:**")
        st.dataframe(df_imp.head(20), use_container_width=True)

        col_data = "Data"
        col_valor = "Valor"
        col_cat = "Categoria"
        col_desc = "Descrição"
        col_pessoa = "Realizada por"
        col_parc = "Número de Parcelas"

        faltando = [c for c in [col_data, col_valor, col_desc, col_pessoa]
                    if c not in df_imp.columns]
        if faltando:
            st.error(f"Colunas faltando: {faltando}")
            return

        st.success(f"✅ {len(df_imp)} linhas encontradas.")
        modo = st.radio("Modo de importação",
                        ["Classificar tudo como Essencial",
                         "Usar coluna Categoria (Essencial/Não Essencial)",
                         "Definir classificação fixa"],
                        horizontal=True, key="import_modo_radio")
        class_fixa = "Essencial"
        if modo == "Definir classificação fixa":
            class_fixa = st.selectbox("Classificação", CLASSIFICACOES,
                                      key="import_class_fixa")

        if st.button("🚀 Importar", type="primary", key="btn_importar"):
            importados = 0
            erros = 0

            for _, row in df_imp.iterrows():
                try:
                    data_raw = row[col_data]
                    if pd.isna(data_raw):
                        continue
                    if isinstance(data_raw, str):
                        try:
                            data_lanc = pd.to_datetime(data_raw).date()
                        except Exception:
                            continue
                    else:
                        data_lanc = pd.to_datetime(data_raw).date()

                    valor = row[col_valor]
                    if pd.isna(valor) or not isinstance(valor, (int, float)):
                        try:
                            valor = float(str(valor).replace("=", "").split("*")[0])
                        except Exception:
                            erros += 1
                            continue
                    valor = float(valor)
                    if valor <= 0:
                        continue

                    desc = str(row.get(col_desc, "—"))[:80]
                    pessoa_raw = str(row.get(col_pessoa, "Jeany e Rafael")).strip()
                    pessoa = pessoa_raw if pessoa_raw in ["Jeany", "Rafael"] else "Jeany e Rafael"

                    n_parc = row.get(col_parc, 1)
                    try:
                        n_parc = int(float(n_parc)) if not pd.isna(n_parc) else 1
                    except Exception:
                        n_parc = 1
                    n_parc = max(1, n_parc)

                    if modo == "Usar coluna Categoria (Essencial/Não Essencial)":
                        cat_val = str(row.get(col_cat, "Essencial")).strip()
                        classificacao = cat_val if cat_val in CLASSIFICACOES else "Essencial"
                    elif modo == "Definir classificação fixa":
                        classificacao = class_fixa
                    else:
                        classificacao = "Essencial"

                    categoria = "Importado"
                    pagador = "Rafael" if pessoa == "Jeany e Rafael" else pessoa

                    if n_parc > 1:
                        grupo_id = str(uuid.uuid4())
                        parcelas = calcular_parcelas(valor, n_parc)
                        for idx, v in enumerate(parcelas):
                            mes_ref = somar_meses(data_lanc, idx).strftime("%Y-%m")
                            dados["lancamentos"].append({
                                "id": str(uuid.uuid4()),
                                "data": data_lanc.strftime("%Y-%m-%d"),
                                "tipo": "despesa", "valor": float(v),
                                "categoria": categoria, "classificacao": classificacao,
                                "descricao": desc, "forma_pagamento": "Crédito",
                                "pessoa": pessoa, "pagador": pagador,
                                "parcela_atual": idx + 1, "total_parcelas": n_parc,
                                "grupo_parcela": grupo_id, "valor_total": valor,
                                "mes_referencia": mes_ref, "eh_parcela": True,
                                "antecipado": False, "antecipado_por": None,
                            })
                            importados += 1
                    else:
                        mes_ref = data_lanc.strftime("%Y-%m")
                        dados["lancamentos"].append({
                            "id": str(uuid.uuid4()),
                            "data": data_lanc.strftime("%Y-%m-%d"),
                            "tipo": "despesa", "valor": valor,
                            "categoria": categoria, "classificacao": classificacao,
                            "descricao": desc, "forma_pagamento": "—",
                            "pessoa": pessoa, "pagador": pagador,
                            "eh_parcela": False, "mes_referencia": mes_ref,
                            "antecipado": False, "antecipado_por": None,
                        })
                        importados += 1
                except Exception:
                    erros += 1
                    continue

            if salvar_dados(dados):
                st.success(f"✅ {importados} lançamentos importados. {erros} erros ignorados.")
                st.rerun()
    except Exception as e:
        st.error(f"Erro ao ler arquivo: {e}")
        st.info("Verifique se a aba se chama 'Lançamentos_Gastos_Cartão'.")


# ======================= RESUMO TOPO =======================
def resumo_topo():
    if dados["lancamentos"] or dados.get("rendas"):
        df_topo = lancamentos_df(dados)
        mes_ref = st.session_state.get("mes_referencia_global") or somar_meses(date.today(), 1).strftime("%Y-%m")
        df_mes = df_topo[df_topo.apply(lambda r: mes_ref_de(r) == mes_ref, axis=1)]
        desp_mes = df_mes[df_mes["tipo"] == "despesa"]["valor"].sum()

        # 💰 Renda do mês (vinda da aba Renda) — substitui "Receitas do mês"
        renda_j = get_renda(dados, mes_ref, "Jeany")
        renda_r = get_renda(dados, mes_ref, "Rafael")
        renda_mes = renda_j + renda_r

        pendentes = [a for a in dados["acertos"] if a["status"] == "Pendente"]
        total_pend = sum(a["valor"] for a in pendentes)

        c1, c2, c3 = st.columns(3) # Mudei para 3 colunas
        c1.metric("💸 Despesas do mês", fmt_moeda(desp_mes))
        c2.metric("💰 Renda do mês", fmt_moeda(renda_mes),
                  help=f"Jeany: {fmt_moeda(renda_j)} | Rafael: {fmt_moeda(renda_r)}")
        c3.metric("⏳ Acertos pendentes",
                  f"{len(pendentes)}" if len(pendentes) == 0
                  else f"{len(pendentes)} ({fmt_moeda(total_pend)})")
        st.divider()
    else:
        st.info("👋 Bem-vindo! Comece cadastrando um lançamento na aba **➕ Novo**.")
        st.divider()


# ======================= NAVEGAÇÃO =======================
st.markdown("""
<div style="
    font-size: 2.2rem;
    font-weight: 700;
    color: #e8eaed;
    display: inline-block;
    margin-bottom: 0;
"><span style="color: #2ecc71;">💰</span> Controle de Custos</div>
""", unsafe_allow_html=True)
st.markdown('<div class="subtitle">Gerencie despesas e receitas com sincronização no Firebase Firestore</div>',
            unsafe_allow_html=True)

with st.sidebar:
    st.header("⚙️ Configurações")
    st.toggle("👁️ Mostrar valores", value=True, key="mostrar_valores")
    if st.session_state.get("mostrar_valores", True):
        st.caption("👁️ Valores visíveis")
    else:
        st.caption("🙈 Valores ocultos")

    if st.button("🔄 Recarregar dados do Firebase", key="btn_reconectar"):
        st.session_state.clear()
        st.rerun()
    st.caption("Sincroniza automaticamente ao salvar/editar")
    st.divider()

    # 🆕 Mês de referência global editável
    st.subheader("📅 Mês de referência")

    # Lista de meses disponíveis (baseado nos dados + corrente + próximo)
    meses_disponiveis = sorted(set(
        [date.today().strftime("%Y-%m"),
         somar_meses(date.today(), 1).strftime("%Y-%m"),
         somar_meses(date.today(), -1).strftime("%Y-%m")] +
        list(dados["rendas"].keys()) +
        [l.get("mes_referencia", "") for l in dados["lancamentos"] if l.get("mes_referencia")]
    ), reverse=True)
    meses_disponiveis = [m for m in meses_disponiveis if m]

    mes_atual_global = st.session_state.mes_referencia_global
    if mes_atual_global not in meses_disponiveis:
        meses_disponiveis.insert(0, mes_atual_global)

    mes_escolhido = st.selectbox(
        "Selecione",
        options=meses_disponiveis,
        index=meses_disponiveis.index(mes_atual_global),
        format_func=lambda m: f"{m[5:]}/{m[:4]}",
        key="sidebar_mes_sel",
        label_visibility="collapsed",
    )
    st.session_state.mes_referencia_global = mes_escolhido

    # Campo manual para digitar um mês específico
    novo_mes_sidebar = st.text_input(
        "Ou digite (YYYY-MM)",
        placeholder="Ex: 2026-12",
        key="sidebar_mes_input",
        label_visibility="collapsed",
    )
    if novo_mes_sidebar and len(novo_mes_sidebar) == 7 and novo_mes_sidebar[4] == "-":
        try:
            int(novo_mes_sidebar[:4])
            int(novo_mes_sidebar[5:])
            st.session_state.mes_referencia_global = novo_mes_sidebar
        except ValueError:
            st.caption("⚠️ Formato inválido. Use YYYY-MM.")

    st.caption(f"📍 Mês ativo: **{st.session_state.mes_referencia_global[5:]}/{st.session_state.mes_referencia_global[:4]}**")
    st.divider()

pages = {
    "Operação": [
        st.Page(render_novo, title="➕ Novo Lançamento", default=True),
        st.Page(render_lista, title="📋 Lançamentos"),
        st.Page(render_renda, title="💰 Renda"),
    ],
    "Planejamento": [
        st.Page(render_orcamentos, title="🎯 Orçamentos"),
        st.Page(render_projecao, title="📈 Projeção"),
        st.Page(render_financiamentos, title="🏦 Financiamentos"),
        st.Page(render_dividas, title="👥 Dívidas"),
    ],
    "Análise": [
        st.Page(render_acerto, title="⚖️ Acerto de Contas"),
        st.Page(render_acertos_pendentes, title="✅ Acertos Pendentes"),
        st.Page(render_relatorios, title="📊 Relatórios"),
    ],
    "Configuração": [
        st.Page(render_categorias, title="🏷️ Categorias"),
        st.Page(render_importar, title="⚙️ Importar Excel"),
    ],
}

pg = st.navigation(pages, position="sidebar")
resumo_topo()
pg.run()