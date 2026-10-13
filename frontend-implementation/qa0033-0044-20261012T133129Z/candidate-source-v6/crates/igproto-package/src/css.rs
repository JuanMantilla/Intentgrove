//! Small declaration-list profile over a real CSS tokenizer. No stylesheet parser.
use cssparser::{Delimiter, Parser, ParserInput, ToCss, Token};
use std::collections::BTreeMap;
fn value<'i>(p: &mut Parser<'i, '_>) -> std::result::Result<String, cssparser::ParseError<'i, ()>> {
    let mut out = String::new();
    while !p.is_exhausted() {
        let start = p.position();
        let t = p.next_including_whitespace_and_comments()?.clone();
        match t {
            Token::Function(ref name) if matches!(name.as_ref(), "rgb" | "rgba") => {
                out.push_str(name);
                out.push('(');
                out.push_str(&p.parse_nested_block(numeric_color)?);
                out.push(')');
            }
            Token::Function(ref name) if name.eq_ignore_ascii_case("url") => {
                let s = p.parse_nested_block(|q| {
                    let s = q.expect_url_or_string()?.to_string();
                    q.expect_exhausted()?;
                    Ok(s)
                })?;
                if !s.starts_with('#') {
                    return Err(p.new_custom_error(()));
                }
                out.push_str(&format!("url({s})"));
            }
            Token::UnquotedUrl(ref u) if u.starts_with('#') => out.push_str(&format!("url({u})")),
            Token::Number { .. } | Token::Percentage { .. } => {
                out.push_str(p.slice(start..p.position()))
            }
            Token::Dimension { ref unit, .. } => {
                let raw = p.slice(start..p.position());
                out.push_str(&raw[..number_prefix(raw)]);
                out.push_str(&unit.to_ascii_lowercase());
            }
            Token::Ident(_)
            | Token::IDHash(_)
            | Token::Hash(_)
            | Token::Comma
            | Token::WhiteSpace(_) => out.push_str(&t.to_css_string()),
            Token::Comment(_) => out.push(' '),
            _ => return Err(p.new_custom_error(())),
        }
    }
    Ok(out.trim().to_string())
}
fn numeric_color<'i>(
    p: &mut Parser<'i, '_>,
) -> std::result::Result<String, cssparser::ParseError<'i, ()>> {
    let mut out = String::new();
    while !p.is_exhausted() {
        let start = p.position();
        let t = p.next_including_whitespace_and_comments()?.clone();
        match t {
            Token::Number { value, .. }
            | Token::Percentage {
                unit_value: value, ..
            } if value.is_finite() => out.push_str(p.slice(start..p.position())),
            Token::Comma | Token::WhiteSpace(_) => out.push_str(&t.to_css_string()),
            Token::Comment(_) => out.push(' '),
            _ => return Err(p.new_custom_error(())),
        }
    }
    Ok(out)
}
// Tokenization already proves a dimension. Retain its numeric spelling rather
// than serializing cssparser's f32 token value; only expand/canonicalize the unit.
fn number_prefix(s: &str) -> usize {
    let b = s.as_bytes();
    let mut i = usize::from(b.first().is_some_and(|c| matches!(c, b'+' | b'-')));
    while b.get(i).is_some_and(u8::is_ascii_digit) {
        i += 1;
    }
    if b.get(i) == Some(&b'.') {
        i += 1;
        while b.get(i).is_some_and(u8::is_ascii_digit) {
            i += 1;
        }
    }
    if b.get(i).is_some_and(|c| matches!(c, b'e' | b'E')) {
        let mut end = i + 1;
        if b.get(end).is_some_and(|c| matches!(c, b'+' | b'-')) {
            end += 1;
        }
        let start = end;
        while b.get(end).is_some_and(u8::is_ascii_digit) {
            end += 1;
        }
        if end > start {
            i = end;
        }
    }
    i
}
pub fn declarations(s: &str) -> std::result::Result<BTreeMap<String, String>, &'static str> {
    let mut input = ParserInput::new(s);
    let mut p = Parser::new(&mut input);
    let mut attrs = BTreeMap::new();
    while !p.is_exhausted() {
        let name = p
            .expect_ident()
            .map_err(|_| "expected CSS property")?
            .to_ascii_lowercase();
        if !crate::svg_policy::presentation(&name) {
            return Err("unsupported CSS property");
        }
        p.expect_colon().map_err(|_| "expected CSS colon")?;
        let v = if name == "font-family" {
            p.parse_until_before(Delimiter::Semicolon, |p| {
                let s = p.expect_ident_or_string()?.to_string();
                p.expect_exhausted()?;
                Ok::<_, cssparser::ParseError<'_, ()>>(s)
            })
            .map_err(|_| "invalid font family")?
        } else {
            p.parse_until_before(Delimiter::Semicolon, value)
                .map_err(|_| "unsafe or malformed CSS value")?
        };
        if v.is_empty() {
            return Err("empty CSS value");
        }
        attrs.insert(name, v);
        if !p.is_exhausted() {
            p.expect_semicolon().map_err(|_| "expected CSS semicolon")?;
        }
    }
    Ok(attrs)
}
