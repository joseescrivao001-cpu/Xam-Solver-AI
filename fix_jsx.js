
const fs = require("fs");
let page = fs.readFileSync("src/app/pricing/page.tsx", "utf8");
page = page.replace(/return \(\n\s*\{isLoading &&/g, "return (\n    <>\n      {isLoading &&");
// We need to find the last </div> before the closing );
const lastIndex = page.lastIndexOf("</div>\n    );\n  }");
if (lastIndex !== -1) {
    page = page.substring(0, lastIndex) + "</div>\n    </>\n    );\n  }";
} else {
    // try a more generic approach if that format is slightly different
    page = page.replace(/<\/div>\s*\);\s*\}/, "</div>\n    </>\n  );\n}");
}
fs.writeFileSync("src/app/pricing/page.tsx", page, "utf8");

