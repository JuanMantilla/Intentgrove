use igproto_package::{budget::PackageBudget, limits};
#[test]
fn aggregate_svg_bytes() {
    let mut b = PackageBudget::default();
    for _ in 0..16 {
        b.scene(limits::SVG, 1, 0).unwrap();
    }
    assert!(b.scene(1, 1, 0).is_err());
}
#[test]
fn aggregate_elements() {
    let mut b = PackageBudget::default();
    for _ in 0..10 {
        b.scene(100, limits::ELEMENTS, 0).unwrap();
    }
    assert!(b.scene(100, 1, 0).is_err());
}
#[test]
fn aggregate_path_items() {
    let mut b = PackageBudget::default();
    for _ in 0..5 {
        b.scene(100, 1, limits::PATH_ITEMS).unwrap();
    }
    assert!(b.scene(100, 1, 1).is_err());
}
#[test]
fn aggregate_asset_count() {
    let mut b = PackageBudget::default();
    for _ in 0..128 {
        b.png(100, 4).unwrap();
    }
    assert!(b.png(100, 4).is_err());
}
#[test]
fn aggregate_encoded_assets() {
    let mut b = PackageBudget::default();
    for _ in 0..12 {
        b.png(limits::PNG, 4).unwrap();
    }
    assert!(b.png(1, 4).is_err());
}
#[test]
fn aggregate_decoded_assets() {
    let mut b = PackageBudget::default();
    for _ in 0..4 {
        b.png(100, limits::PIXELS * 4).unwrap();
    }
    assert!(b.png(100, 4).is_err());
}
#[test]
fn independent_aggregate_quota() {
    let mut b = PackageBudget::default();
    b.png(limits::PNG_TOTAL, limits::DECODED).unwrap();
    b.scene(
        limits::SVG_TOTAL,
        limits::ELEMENTS_TOTAL,
        limits::PATH_ITEMS_TOTAL,
    )
    .unwrap();
    assert!(b.scene(1, 0, 0).is_err());
}
#[test]
fn overflow_fails_closed() {
    assert!(PackageBudget::default().scene(usize::MAX, 0, 0).is_err());
    assert!(PackageBudget::default().png(0, u64::MAX).is_err());
}
