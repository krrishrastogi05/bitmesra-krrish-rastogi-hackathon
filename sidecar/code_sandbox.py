"""
Sandboxed Python code execution for the analyst workbench.
Runs user code with a restricted set of builtins, an import allow-list and a 30 s time limit.

ponytail: this is an in-process sandbox. It stops casual misuse, not a determined attacker.
For a real deployment, run each job in a separate container with no network access.
"""
import io
import sys
import base64
import traceback
import threading
from contextlib import redirect_stdout, redirect_stderr
from typing import Any


# Maximum execution time (seconds)
MAX_EXECUTION_TIME = 30


class CodeExecutionResult:
    """Result of sandboxed code execution."""
    def __init__(self):
        self.stdout: str = ""
        self.stderr: str = ""
        self.figures: list[str] = []  # base64 PNG strings
        self.error: str | None = None
        self.success: bool = False
        self.table: dict | None = None  # set when the code assigns a DataFrame or Series to `result`


def execute_code(code: str, dataframe=None, extra: dict | None = None) -> CodeExecutionResult:
    """
    Execute Python code in a sandboxed environment.

    Args:
        code: Python code string to execute.
        dataframe: pandas DataFrame to make available as 'df'.
        extra: more names to put in the namespace (for example the signal DataFrames).

    Returns:
        CodeExecutionResult with stdout, figures, and error info.
    """
    result = CodeExecutionResult()

    # Prepare the execution namespace
    import pandas as pd
    import numpy as np

    namespace = {
        "__builtins__": _get_safe_builtins(),
        "pd": pd,
        "np": np,
        "df": dataframe,
        "_figures": [],  # Code appends base64 figures here
        **(extra or {}),
    }

    # Add optional imports
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
        plt.style.use("dark_background")

        # Monkey-patch plt.show() so LLM-generated code that calls plt.show()
        # automatically saves the figure to _figures instead of discarding it.
        # With the Agg backend, plt.show() clears figures without rendering anything,
        # which is why charts were missing from responses.
        def _safe_show(*args, **kwargs):
            for fig_num in plt.get_fignums():
                fig = plt.figure(fig_num)
                buf = io.BytesIO()
                fig.savefig(
                    buf, format="png", dpi=150, bbox_inches="tight",
                    facecolor="#111827", edgecolor="none",
                )
                buf.seek(0)
                namespace["_figures"].append(base64.b64encode(buf.read()).decode())
                plt.close(fig)

        plt.show = _safe_show
        namespace["matplotlib"] = matplotlib
        namespace["plt"] = plt
    except ImportError:
        pass

    try:
        import seaborn as sns
        namespace["sns"] = sns
        namespace["seaborn"] = sns
    except ImportError:
        pass

    try:
        import scipy
        import scipy.stats
        namespace["scipy"] = scipy
    except ImportError:
        pass

    try:
        from sklearn import preprocessing, cluster
        import sklearn
        namespace["sklearn"] = sklearn
    except ImportError:
        pass

    # Add helper modules
    namespace["io"] = io
    namespace["base64"] = base64
    namespace["json"] = __import__("json")
    namespace["math"] = __import__("math")
    namespace["re"] = __import__("re")
    namespace["datetime"] = __import__("datetime")
    namespace["collections"] = __import__("collections")
    namespace["statistics"] = __import__("statistics")

    # Capture stdout and stderr (use errors='replace' so emoji don't crash on Windows cp1252)
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    # Execute with timeout using a daemon thread
    execution_error = [None]
    execution_done = threading.Event()

    def run_code():
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, namespace)
        except Exception as e:
            execution_error[0] = f"{type(e).__name__}: {str(e)}"
        finally:
            execution_done.set()

    thread = threading.Thread(target=run_code, daemon=True)
    thread.start()
    thread.join(timeout=MAX_EXECUTION_TIME)

    if thread.is_alive():
        result.error = f"Code execution timed out after {MAX_EXECUTION_TIME} seconds."
        result.success = False
        return result

    # Collect results — encode to ASCII with replace so emoji never cause charmap errors
    def _safe_str(s: str) -> str:
        return s.encode("utf-8", errors="replace").decode("utf-8", errors="replace")

    result.stdout = _safe_str(stdout_capture.getvalue())
    result.stderr = _safe_str(stderr_capture.getvalue())
    result.figures = namespace.get("_figures", [])
    result.error = execution_error[0]
    result.success = execution_error[0] is None
    result.table = _to_table(namespace.get("result"))

    # Auto-capture any open matplotlib figures not manually saved
    try:
        import matplotlib.pyplot as plt
        for fig_num in plt.get_fignums():
            fig = plt.figure(fig_num)
            buf = io.BytesIO()
            fig.savefig(
                buf, format="png", dpi=150, bbox_inches="tight",
                facecolor="#111827", edgecolor="none",
            )
            buf.seek(0)
            result.figures.append(base64.b64encode(buf.read()).decode())
            plt.close(fig)
    except Exception:
        pass

    return result


def _to_table(value: Any, max_rows: int = 200) -> dict | None:
    """Convert a DataFrame or Series to {columns, rows} for the UI. Other values give None."""
    import pandas as pd
    if isinstance(value, pd.Series):
        value = value.to_frame()
    if not isinstance(value, pd.DataFrame):
        return None
    df = value.head(max_rows).reset_index()
    df = df.astype(object).where(pd.notna(df), None)
    return {"columns": [str(c) for c in df.columns], "rows": [[_plain(v) for v in row] for row in df.itertuples(index=False)],
            "total_rows": int(len(value))}


def _plain(v: Any) -> Any:
    """Make numpy and pandas scalars JSON-safe."""
    if hasattr(v, "item"):
        try:
            return v.item()
        except (ValueError, AttributeError):
            pass
    return v if isinstance(v, (int, float, str, bool, type(None))) else str(v)


def _get_safe_builtins() -> dict:
    """Return a restricted set of Python builtins with a whitelisted import function."""
    import builtins
    safe = {}
    allowed = [
        "abs", "all", "any", "bool", "chr", "dict", "dir",
        "divmod", "enumerate", "filter", "float", "format",
        "frozenset", "getattr", "hasattr", "hash", "hex",
        "int", "isinstance", "issubclass", "iter", "len",
        "list", "map", "max", "min", "next", "oct", "ord",
        "pow", "print", "range", "repr", "reversed", "round",
        "set", "slice", "sorted", "str", "sum", "super",
        "tuple", "type", "vars", "zip",
        "True", "False", "None",
        "Exception", "ValueError", "TypeError", "KeyError",
        "IndexError", "RuntimeError", "StopIteration",
        "ZeroDivisionError", "AttributeError", "NameError",
        "NotImplementedError", "OverflowError",
    ]
    for name in allowed:
        if hasattr(builtins, name):
            safe[name] = getattr(builtins, name)

    # Allow imports only for whitelisted data-science modules
    ALLOWED_IMPORTS = {
        "pandas", "numpy", "matplotlib", "seaborn",
        "scipy", "sklearn", "io", "base64", "json",
        "math", "re", "datetime", "collections",
        "statistics", "itertools", "functools", "operator",
        "warnings", "textwrap", "string", "random",
    }
    original_import = builtins.__import__

    def safe_import(name, *args, **kwargs):
        base = name.split(".")[0]
        if base not in ALLOWED_IMPORTS:
            raise ImportError(
                f"Import of '{name}' is not allowed in this sandbox. "
                f"Allowed: {', '.join(sorted(ALLOWED_IMPORTS))}"
            )
        return original_import(name, *args, **kwargs)

    safe["__import__"] = safe_import
    return safe
