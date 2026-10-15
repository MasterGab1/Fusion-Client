package fusion.runtime;

final class ParticleDistanceMod {
    private long nextPosition;
    private Object lastPlayer;
    private double x, y, z;
    private boolean reported;
    static boolean outside(double dx, double dy, double dz, int distance) { return dx * dx + dy * dy + dz * dz > distance * distance; }
    void created(MinecraftAdapter game, RuntimeConfig config, Object particle) throws Exception {
        Object mc = game.minecraft();
        if (mc == null || particle == null) return;
        Object player = game.player(mc);
        if (player == null) return;
        long now = System.nanoTime();
        if (player != lastPlayer || now >= nextPosition) {
            x = game.coordinate(player, 0); y = game.coordinate(player, 1); z = game.coordinate(player, 2);
            lastPlayer = player; nextPosition = now + 25000000L;
        }
        if (outside(game.particleCoordinate(particle, 0) - x, game.particleCoordinate(particle, 1) - y, game.particleCoordinate(particle, 2) - z, config.particleDistance)) {
            game.expire(particle);
            if (!reported) { reported = true; System.out.println("[Fusion] Distant particle expired beyond " + config.particleDistance + " blocks"); }
        }
    }
}
