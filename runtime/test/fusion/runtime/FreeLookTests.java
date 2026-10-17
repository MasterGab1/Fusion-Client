package fusion.runtime;
final class FreeLookTests {
    private static void check(boolean value){if(!value)throw new AssertionError();}
    static class Input implements FreeLookMod.Input {
        Object current=new Object();boolean held=true,available=true;int mode=2,restores;float aimYaw=45,aimPitch=10;
        public Object player(){return current;}public boolean held(){return held;}public boolean available(){return available;}
        public float yaw(Object p){return aimYaw;}public float pitch(Object p){return aimPitch;}
        public Object mode(){return mode;}public void thirdPerson(){mode=1;}public void restore(Object m){mode=(Integer)m;restores++;}
    }
    static void run() throws Exception {
        Input input=new Input();FreeLookMod mod=new FreeLookMod(input,false);
        check(!mod.turn(input.current,20,20,false));check(input.mode==2);
        check(mod.turn(input.current,100,100,true));check(mod.yaw(0)==60&&mod.pitch(0)==25);check(input.mode==1);
        check(input.aimYaw==45&&input.aimPitch==10);check(!mod.turn(new Object(),100,100,true));
        mod.turn(input.current,0,10000,true);check(mod.pitch(0)==90);
        input.held=false;mod.poll(true);check(input.mode==2&&mod.yaw(12)==12&&input.restores==1);
        input.held=true;mod.poll(true);input.available=false;mod.poll(true);check(input.mode==2&&input.restores==2);
        input.available=true;mod.poll(true);mod.poll(false);check(input.mode==2&&input.restores==3);
        mod.poll(true);input.current=null;mod.poll(true);check(input.mode==2&&input.restores==4);
        input.current=new Object();FreeLookMod legacy=new FreeLookMod(input,true);legacy.turn(input.current,0,100,true);check(legacy.pitch(0)==-5);legacy.release();check(input.mode==2);
        System.out.println("PASS: free look keeps player aim unchanged, clamps camera pitch and restores perspective on release, disable, menus/focus loss and disconnect.");
    }
}
