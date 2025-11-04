# ------------------------------------------------------------
# UMAP → Cluster → CSV with ONLY requested columns
# ------------------------------------------------------------

# install.packages("umap")  # if needed
# install.packages("dbscan")

suppressPackageStartupMessages({
  library(umap)
  library(dbscan)
})

# ---------- Config ----------
keep_models <- c(
  "F-150", "F-150 Hybrid", "F-150 Lightning EV", "HUMMER Pickup EV", "Pickup 1500", "R1T", "Sierra 1500", "Silverado 1500", "Titan",
  "Tundra", "Tundra Hybrid"
)

wanted_demo <- c(
  # ---------------- Demographics ----------------
  "BLD_AGE_GRP",
  "DEMO_EDUCATION",
  "GENERATION_GRP",
  "DEMO_GENDER1",
  "BLD_HOBBY1_GRP",
  "DEMO_INCOME",
  "BLD_LIFESTAGE",
  "DEMO_LOCATION",
  "DEMO_MARITAL",
  "DEMO_EMPLOY",
  "ADMARK_STATE",
  "BLD_CHILDREN",
  "DEMO_EMPTY_NESTER",
  
  # ---------------- Financing ----------------
  "C1_PL",
  "FIN_PU_APR",
  "FIN_PU_DOWN_PAY",
  "FIN_PU_TRADE_IN",
  "BLD_FIN_TOTAL_MONPAY",
  "FIN_LE_LENGTH",
  "FIN_PU_LENGTH",
  "FIN_CREDIT",
  "FIN_PRICE_UNEDITED",
  
  # ---------------- Buying Behavior ----------------
  "PR_MOST",
  "C2S_MODEL_RESPONSE",
  "SRC_TOP1",
  
  # ---------------- Loyalty (Scatterplot) ----------------
  "OL_MODEL_GRP",
  "STATE_BUY_BEST",
  "STATE_CONTINUE",
  "STATE_FEEL_GOOD",
  "STATE_REFER",
  "STATE_PRESTIGE",
  "STATE_EURO",
  "STATE_AMER",
  "STATE_ASIAN",
  "STATE_SWITCH_FEAT",
  "STATE_VALUES",
  
  # ---------------- Willingness to Pay (Scatterplot) ----------------
  "PV_TAX_INS",
  "PV_SPEND_LUXURY",
  "PV_PRESTIGE",
  "PV_QUALITY",
  "PV_RESALE",
  "PV_INEXP_MAINTAIN",
  "PV_AVOID",
  "PV_SURVIVE",
  "PV_PAY_MORE",
  "PV_BREAKDOWN",
  "PV_VALUE",
  "PV_SPEND",
  "PV_LEASE",
  "PV_PUTOFF",
  "STATE_BALANCE",
  "STATE_WAIT",
  "STATE_ENJOY_PRESTIGE",
  "STATE_FIRST_YR",
  "STATE_NO_LOW_PRICE",
  "STATE_AUDIO",
  "STATE_MON_PAY",
  "STATE_SHOP_MANY"
)
  
outfile <- "larg_pu_row_level_with_clusters_categories.csv"

# ---------- Load ----------
fp <- if (file.exists("nvcs-2025.csv")) "nvcs-2025.csv" else
  if (file.exists("nvcs-2025"))      "nvcs-2025"      else
    stop("Couldn't find 'nvcs-2025.csv' or 'nvcs-2025' in the working directory.")
dat <- read.csv(fp, stringsAsFactors = FALSE, check.names = FALSE)

# Guard against duplicate column names (keeps originals; adds __dupN only to extras)
if (anyDuplicated(names(dat))) {
  names(dat) <- make.unique(names(dat), sep = "__dup")
  message("Note: duplicate column names disambiguated with '__dup' suffixes.")
}

# Ensure required column exists
if (!("BLD_DESC_RV_MODEL" %in% names(dat))) {
  stop("Column 'BLD_DESC_RV_MODEL' not found. Check the exact header name in the CSV.")
}

# ---------- Filter to selected models ----------
dat <- dat[!is.na(dat$BLD_DESC_RV_MODEL) & dat$BLD_DESC_RV_MODEL %in% keep_models, , drop = FALSE]
if (nrow(dat) < 2) stop("After filtering, too few rows remain to compute UMAP/clusters.")
labels_raw <- dat[["BLD_DESC_RV_MODEL"]]

# ---------- Helpers ----------
clean_numeric <- function(x) {
  x_chr <- as.character(x)
  has_pct <- grepl("%", x_chr)
  x_chr <- gsub("[,$]", "", x_chr)
  x_chr <- gsub("%", "", x_chr)
  x_num <- suppressWarnings(as.numeric(x_chr))
  if (any(has_pct, na.rm = TRUE)) x_num <- x_num / 100
  x_num
}
is_numeric_like <- function(x, thresh = 0.60) {
  xn <- clean_numeric(x)
  mean(is.finite(xn)) >= thresh
}

# ---------- Build numeric matrix for UMAP/clustering (NOT included in output) ----------
# Start with numeric-like candidates
cand <- vapply(dat, is_numeric_like, logical(1))
num_names <- names(dat)[cand]

# Exclude known non-feature fields from the numeric set
exclude_from_features <- c("BLD_DESC_RV_MODEL", wanted_demo)
num_names <- setdiff(num_names, exclude_from_features)

if (length(num_names) < 2) {
  stop("Fewer than 2 usable numeric-like feature columns after cleaning; add more numeric features.")
}

# Parse & clean numeric features
X <- as.data.frame(lapply(dat[num_names], clean_numeric), check.names = FALSE)

# Drop all-NA and constant columns
keep_non_all_na <- vapply(X, function(col) any(is.finite(col)), logical(1))
X <- X[, keep_non_all_na, drop = FALSE]
if (ncol(X) < 2) stop("After removing all-NA features, fewer than 2 remain.")

keep_has_var <- vapply(X, function(col) sd(col, na.rm = TRUE) > 0, logical(1))
X <- X[, keep_has_var, drop = FALSE]
if (ncol(X) < 2) stop("After removing zero-variance features, fewer than 2 remain.")

# Impute NAs with column medians
for (j in seq_len(ncol(X))) {
  col <- X[[j]]
  med <- suppressWarnings(median(col[is.finite(col)], na.rm = TRUE))
  if (is.finite(med)) col[!is.finite(col)] <- med
  X[[j]] <- col
}
if (ncol(X) < 2) stop("After imputation, fewer than 2 usable features remain.")

# Keep rows with valid model labels (align all downstream objects to these rows)
ok_rows <- !is.na(labels_raw) & labels_raw != ""
X <- X[ok_rows, , drop = FALSE]
labels <- factor(labels_raw[ok_rows], levels = keep_models[keep_models %in% unique(labels_raw[ok_rows])])
if (nrow(X) < 2) stop("Too few labeled rows to cluster.")

# ---------- UMAP ----------
set.seed(123)
X_scaled <- scale(X)
emb <- umap(as.matrix(X_scaled))$layout
colnames(emb) <- c("emb_x", "emb_y")

# ---------- HDBSCAN with k-means fallback ----------
set.seed(123)
n <- nrow(emb)
minPts <- max(10, min(60, round(sqrt(n))))
hdb <- hdbscan(emb, minPts = minPts)

if (all(hdb$cluster == 0)) {
  message("HDBSCAN found only noise; falling back to k-means.")
  ks <- 2:min(12, max(2, floor(n/30)))
  if (length(ks) == 1) ks <- c(2, 3)
  wss <- sapply(ks, function(k) kmeans(emb, centers = k, nstart = 25)$tot.withinss)
  k_best <- ks[which.min(diff(c(Inf, wss)) + wss/mean(wss))]
  clus <- kmeans(emb, centers = k_best, nstart = 50)$cluster
} else {
  clus <- ifelse(hdb$cluster == 0, NA_integer_, hdb$cluster)  # 0=noise → NA
}

# ---------- Assemble ONLY requested columns ----------
# Align demos to ok_rows and keep only those present
present_demo <- intersect(wanted_demo, names(dat))
if (length(present_demo) < length(wanted_demo)) {
  missing_demo <- setdiff(wanted_demo, present_demo)
  if (length(missing_demo)) {
    message("Warning: missing demo columns (omitted): ", paste(missing_demo, collapse = ", "))
  }
}
demos <- if (length(present_demo)) dat[ok_rows, present_demo, drop = FALSE] else NULL

out <- data.frame(
  BLD_DESC_RV_MODEL = labels,
  cluster = clus,
  emb_x = emb[, "emb_x"],
  emb_y = emb[, "emb_y"],
  check.names = FALSE
)
if (!is.null(demos)) out <- cbind(out, demos)

# Sanity: ensure exactly the columns we intend
expected_cols <- c("BLD_DESC_RV_MODEL", "cluster", "emb_x", "emb_y", present_demo)
out <- out[, expected_cols, drop = FALSE]

# ---------- Write CSV ----------
write.csv(out, outfile, row.names = FALSE)
message("Wrote ", nrow(out), " rows and ", ncol(out), " columns to '", outfile, "'.")
