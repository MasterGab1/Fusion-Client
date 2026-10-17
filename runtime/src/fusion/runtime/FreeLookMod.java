package fusion.runtime;

/** Camera-only state; the player rotation is read, never assigned. */
final class FreeLookMod {
    interface Input {
        Object player() throws Exception;
        boolean held() throws Exception;
        boolean available() throws Exception;
        float yaw(Object player) throws Exception;
        float pitch(Object player) throws Exception;
        Object mode() throws Exception;
        void thirdPerson() throws Exception;
        void restore(Object mode) throws Exception;
    }
    private final Input input;
    private final boolean legacy;
    private boolean active;
    private Object player, previousMode;
    private float yaw, pitch;
    FreeLookMod(Input input, boolean legacy) { this.input=input;this.legacy=legacy; }
    void poll(boolean enabled) throws Exception {
        Object current=input.player();
        boolean wanted=enabled&&current!=null&&input.held()&&input.available();
        if(active&&(!wanted||current!=player))release();
        if(wanted&&!active){
            previousMode=input.mode();player=current;yaw=input.yaw(current);pitch=input.pitch(current);
            input.thirdPerson();active=true;
        }
    }
    void release() throws Exception { if(active){active=false;input.restore(previousMode);player=null;} }
    boolean turn(Object target,double dx,double dy,boolean enabled) throws Exception {
        poll(enabled);if(!active||target!=player)return false;
        yaw+=(float)(dx*0.15);pitch=clampPitch(pitch+(float)(dy*(legacy?-0.15:0.15)));return true;
    }
    static float clampPitch(float value){return Math.max(-90f,Math.min(90f,value));}
    float yaw(float original){return active?yaw:original;}
    float pitch(float original){return active?pitch:original;}
}
