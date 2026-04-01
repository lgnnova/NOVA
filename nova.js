#!/usr/bin/env node
const fs = require("fs")
const readline = require("readline")
let env = {}

function translate(code) {
    const lines = code.split("\n")
    const out = []
    for (let line of lines) {
        let t = line.trim()
        let ind = line.match(/^\s*/)[0]

        if (t === "") { out.push(""); continue }

        if (t.startsWith("define ")) {
            let name = t.slice(7).trim()
            out.push(`${ind}env["${name}"] = null;`)
            continue
        }

        if (t.startsWith("set ")) {
            let r = t.slice(4).replace(/: *\w+/g, "")
            let [n, v] = r.split("=").map(s => s.trim())
            out.push(`${ind}env["${n}"] = ${v};`)
            continue
        }

        if (t.startsWith("show value ")) {
            let name = t.slice(11).trim()
            out.push(`${ind}console.log(env["${name}"]);`)
            continue
        }

        if (t.startsWith("show ")) {
            out.push(`${ind}console.log(${t.slice(5)});`)
            continue
        }

        if (t.startsWith("when ")) {
            out.push(`${ind}if (${t.slice(5)}) {`)
            continue
        }

        if (t.startsWith("otherwise")) {
            out.push(`${ind}} else {`)
            continue
        }

        if (t.startsWith("repeat ")) {
            let m = t.match(/repeat (\d+) times/)
            if (m) {
                out.push(`${ind}for (let __i=0; __i<${m[1]}; __i++) {`)
                continue
            }
        }

        if (t.startsWith("over ")) {
            let m = t.match(/over (\w+) in (.+)/)
            if (m) {
                out.push(`${ind}for (const ${m[1]} of ${m[2]}) {`)
                continue
            }
        }

        if (t === "end") {
            out.push(ind + "}")
            continue
        }

        t = t.replace(/\byes\b/g, "true").replace(/\bno\b/g, "false")
        out.push(ind + t)
    }
    return out.join("\n")
}

function runFile(path) {
    const code = fs.readFileSync(path, "utf8")
    const js = translate(code)
    try { new Function("env", js)(env) }
    catch (e) { console.log("[ERROR]", e.message) }
}

if (process.argv[2]) {
    runFile(process.argv[2])
    process.exit(0)
}

console.log("NOVA REPL")
console.log("Commands: :load file.nova | :save file.nova | :exit")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function loop() {
    rl.question("> ", line => {
        if (line.startsWith(":load ")) {
            let f = line.slice(6).trim()
            if (fs.existsSync(f)) {
                let code = fs.readFileSync(f, "utf8")
                let js = translate(code)
                try { new Function("env", js)(env) }
                catch (e) { console.log("[ERROR]", e.message) }
            } else console.log("File not found")
            return loop()
        }

        if (line.startsWith(":save ")) {
            let f = line.slice(6).trim()
            fs.writeFileSync(f, "")
            console.log("Saved:", f)
            return loop()
        }

        if (line === ":exit") {
            rl.close()
            return
        }

        let js = translate(line)
        try { new Function("env", js)(env) }
        catch (e) { console.log("[ERROR]", e.message) }

        loop()
    })
}

loop()