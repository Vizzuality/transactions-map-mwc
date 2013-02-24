<?php

/*
41.16365818258816,
41.72981110927634,
2.769495389062513,
1.360498807031263,
10,
13
*/

$zoommin = 0;
$zoommax = 16;
$latmin = 41.16365818258816;
$latmax = 41.72981110927634;
$lonmin = 2.769495389062513;
$lonmax = 1.360498807031263;


for ($z = $zoommin; $z <= $zoommax; $z++) {
    
    $txmin = toTileXY($latmin,$lonmin,$z); 
    $txmin = $txmin["x"];
    $txmax = toTileXY($latmin,$lonmax,$z); 
    $txmax = $txmax["x"];
    $tymin = toTileXY($latmin,$lonmin,$z); 
    $tymin = $tymin["y"];
    $tymax = toTileXY($latmax,$lonmin,$z); 
    $tymax = $tymax["y"];
    
    
    for ($x = $txmax; $x <= $txmin; $x++) {
        for ($y = $tymax; $y <= $tymin; $y++) { 
            echo $z . "-" . $x."-".($y-1)."\n";
            $lala = file_get_contents("http://cartobbva.vizzuality.netdna-cdn.com/tiles/anim/$z/$x/".($y-1).".torque.json?start_date=1330210800&end_date=1330815600");
            
            $lala = file_get_contents("http://cartobbva.vizzuality.netdna-cdn.com/tiles/anim/$z/$x/".($y-1).".torque.json?start_date=1329606000&end_date=1330210800");
            
            //Statis maps (only first day)
            $lala = file_get_contents("http://cartobbva.vizzuality.netdna-cdn.com/tiles/static/$z/$x/".($y-1).".png?day=26&updated_at=ramboFTW");
            
            $lala = file_get_contents("http://cartobbva.vizzuality.netdna-cdn.com/tiles/static/$z/$x/".($y-1).".png?day=19&updated_at=ramboFTW");
            
            
            
            
        }
    } 
}


function toTileXY($lat, $lng, $intZoom) {
        $normalised = toNormalisedPixelCoords($lat, $lng);
        $intScale = 1 << $intZoom; // number of tiles
        
        // can just truncate to integer, this looses the fractional "pixel offset"
        return array(x=>intval(round($normalised['x'] * $intScale)), y=>intval(round($normalised['y']  * $intScale)));
}

function toNormalisedPixelCoords($lat, $lng) {
        // first convert to Mercator projection
        if ($lng > 180) {
                $lng -= 360;
        }
        
        $lng /= 360;
        $lng += 0.5;
        
        $lat = 0.5 - (((log(abs(tan((pi() / 4) + ((0.5 * pi() * $lat) / 180))))) / pi()) / 2);
        
        return array(x=>$lng, y=>$lat);
}

?>