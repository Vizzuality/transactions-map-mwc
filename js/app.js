

var url = 'http://saleiva2.cartodb.com/api/v1/viz/186/viz.json';
cartodb.createVis('map1', url, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE t.tx_date_proc > '2012-02-18T14:00:00+01:00' AND t.tx_date_proc < '2012-02-18T16:30:00+01:00'",
      cartodb_logo: false
  })
  .done(function(vis, layers) {
    return;
  });

cartodb.createVis('map2', url, {
      sql: "SELECT cartodb_id, customer_country, amount, (select the_geom_webmercator FROM comercios_08_mwc as c WHERE t.business_id =c.id ) as the_geom_webmercator FROM tx_output_08_mwc as t WHERE t.tx_date_proc > '2012-02-19T14:00:00+01:00' AND t.tx_date_proc < '2012-02-19T16:30:00+01:00'",
      cartodb_logo: false,
      zoomControl: false
  })
  .done(function(vis, layers) {
    return;
  });
